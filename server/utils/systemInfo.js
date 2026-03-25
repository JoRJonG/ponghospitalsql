import os from 'os'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

const BYTE_UNITS = 1024

function buildDiskResult(totalBytes, freeBytes, mount = '/') {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return null
  }
  const safeFree = Math.max(0, Math.min(totalBytes, Number.isFinite(freeBytes) ? freeBytes : 0))
  const usedBytes = Math.max(0, totalBytes - safeFree)
  const percentUsed = totalBytes ? (usedBytes / totalBytes) * 100 : 0
  return {
    mount,
    totalBytes,
    freeBytes: safeFree,
    usedBytes,
    percentUsed,
    percentFree: 100 - percentUsed,
  }
}

async function getUnixDiskUsage() {
  // ─── 1. Try `quota -s` first (cPanel shared hosting gives real quota here) ──
  try {
    const { stdout: qout } = await execAsync('quota -s 2>/dev/null')
    // quota output: lines like "  Disk quotas for user xxx (uid yyy):"
    // then header line, then data line:
    //   /dev/sdX   blocks  quota  limit  ...
    //   or:  Filesystem  blocks  quota  limit  ...
    const lines = qout.trim().split('\n').filter(Boolean)
    // Find the data line that has numbers (skip headers)
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      // Typical quota output has at least 5 columns; blocks in KB (possibly with *)
      if (parts.length >= 5) {
        const rawUsed = parts[1].replace('*', '')
        const rawLimit = parts[3]  // hard limit (total allocated)
        const usedKb = Number(rawUsed)
        const limitKb = Number(rawLimit)
        if (Number.isFinite(usedKb) && Number.isFinite(limitKb) && limitKb > 0) {
          const totalBytes = limitKb * BYTE_UNITS
          const usedBytes = usedKb * BYTE_UNITS
          const freeBytes = Math.max(0, totalBytes - usedBytes)
          return buildDiskResult(totalBytes, freeBytes, 'quota')
        }
      }
    }
  } catch {
    // quota command not available or no quota set — fall through
  }

  // ─── 2. Fallback: df for current working dir or home dir ────────────────────
  for (const target of ['.', '~', '/']) {
    try {
      const { stdout } = await execAsync(`df -k ${target}`)
      const lines = stdout.trim().split('\n')
      if (lines.length < 2) continue
      const parts = lines[1].trim().split(/\s+/)
      if (parts.length < 5) continue
      const totalKb = Number(parts[1])
      const availKb = Number(parts[3])
      if (!Number.isFinite(totalKb) || totalKb <= 0 || !Number.isFinite(availKb)) continue
      const totalBytes = totalKb * BYTE_UNITS
      const freeBytes = availKb * BYTE_UNITS
      const mount = parts[5] || target
      return buildDiskResult(totalBytes, freeBytes, mount)
    } catch {
      // try next target
    }
  }
  return null
}


async function getWindowsDiskUsage() {
  const commands = [
    // Preferred: PowerShell with CIM (Modern WMI)
    'powershell -Command "Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json"',
    // Fallback: WMIC (Legacy, deprecated in Win11)
    'wmic logicaldisk get size,freespace,caption',
  ]

  for (const command of commands) {
    try {
      const { stdout } = await execAsync(command)
      if (!stdout || !stdout.trim()) continue

      // WMIC output is plain text
      if (command.startsWith('wmic')) {
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
        if (lines.length <= 1) continue
        for (const line of lines.slice(1)) {
          const parts = line.trim().split(/\s+/).filter(Boolean)
          if (parts.length < 3) continue
          const freeBytes = Number(parts[1])
          const totalBytes = Number(parts[2])
          if (Number.isFinite(totalBytes) && totalBytes > 0) {
            return buildDiskResult(totalBytes, freeBytes, parts[0])
          }
        }
      } else {
        // PowerShell JSON output
        let parsed
        try {
          parsed = JSON.parse(stdout)
        } catch {
          continue
        }

        const drives = Array.isArray(parsed) ? parsed : [parsed]
        // Find system drive (usually C:) or use the first available fixed drive
        const systemDrive = drives.find((drive) => {
          const id = (drive?.DeviceID || '').toUpperCase()
          const env = (process.env.SYSTEMDRIVE || 'C:').toUpperCase()
          return id === env || id === env + '\\'
        }) || drives[0]

        if (systemDrive && Number.isFinite(systemDrive.Size)) {
          const totalBytes = Number(systemDrive.Size)
          const freeBytes = Number(systemDrive.FreeSpace)
          return buildDiskResult(totalBytes, freeBytes, systemDrive.DeviceID)
        }
      }
    } catch (error) {
      if (command.startsWith('wmic') && error?.message?.includes('not recognized')) {
        // Suppress wmic missing error
      } else {
        console.warn(`[systemInfo] Disk check failed (${command.split(' ')[0]}):`, error?.message)
      }
    }
  }

  return null
}

export async function getDiskUsage() {
  if (process.platform === 'win32') {
    return getWindowsDiskUsage()
  }
  return getUnixDiskUsage()
}

export function getMemoryUsage() {
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  return buildDiskResult(totalBytes, freeBytes, 'memory')
}

export function getCpuLoad() {
  const load = os.loadavg()
  if (!load || load.length === 0) {
    return { one: 0, five: 0, fifteen: 0 }
  }
  const [one = 0, five = 0, fifteen = 0] = load
  return { one, five, fifteen }
}

export function getSystemMeta() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptimeSeconds: os.uptime(),
  }
}
