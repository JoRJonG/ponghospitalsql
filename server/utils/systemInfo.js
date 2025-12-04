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
  try {
    const { stdout } = await execAsync('df -k /')
    const lines = stdout.trim().split('\n')
    if (lines.length < 2) return null
    const parts = lines[1].trim().split(/\s+/)
    if (parts.length < 5) return null
    const totalKb = Number(parts[1])
    const usedKb = Number(parts[2])
    const availKb = Number(parts[3])
    if (!Number.isFinite(totalKb) || !Number.isFinite(availKb)) return null
    const totalBytes = totalKb * BYTE_UNITS
    const freeBytes = availKb * BYTE_UNITS
    const mount = parts[5] || '/'
    return buildDiskResult(totalBytes, freeBytes, mount)
  } catch (error) {
    console.warn('[systemInfo] df command failed:', error?.message)
    return null
  }
}

async function getWindowsDiskUsage() {
  const commands = [
    'wmic logicaldisk get size,freespace,caption',
    'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,Free,Used,Capacity | ConvertTo-Json"',
  ]

  for (const command of commands) {
    try {
      const { stdout } = await execAsync(command)
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
        const parsed = JSON.parse(stdout)
        const drives = Array.isArray(parsed) ? parsed : [parsed]
        const systemDrive = drives.find((drive) => (drive?.Name || '').toUpperCase() === process.env.SYSTEMDRIVE?.toUpperCase()) || drives[0]
        if (systemDrive && Number.isFinite(systemDrive.Capacity)) {
          const totalBytes = Number(systemDrive.Capacity)
          const freeBytes = Number(systemDrive.Free)
          return buildDiskResult(totalBytes, freeBytes, systemDrive.Name)
        }
      }
    } catch (error) {
      // Try next command if available
      console.warn('[systemInfo] disk command failed:', error?.message)
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
