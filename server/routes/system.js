import { Router } from 'express'
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js'
import { getCpuLoad, getDiskUsage, getMemoryUsage, getSystemMeta } from '../utils/systemInfo.js'
import SiteSetting from '../models/mysql/SiteSetting.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()

const DISPLAY_MODE_KEY = 'display_mode'
const DEFAULT_DISPLAY_MODE = 'force-off'
const ALLOWED_DISPLAY_MODES = new Set(['force-on', 'force-off'])

router.get('/display-mode', async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: { mode: DEFAULT_DISPLAY_MODE } })
    }
    const raw = await SiteSetting.get(DISPLAY_MODE_KEY)
    const mode = ALLOWED_DISPLAY_MODES.has(raw) ? raw : DEFAULT_DISPLAY_MODE
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.json({ success: true, data: { mode } })
  } catch (error) {
    console.error('[system] display-mode error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงโหมดการแสดงผลได้' })
  }
})

router.put('/display-mode', requireAuth, requirePermission('system'), async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลยังไม่พร้อม' })
    }
    const mode = typeof req.body?.mode === 'string' ? req.body.mode.trim() : ''
    if (!ALLOWED_DISPLAY_MODES.has(mode)) {
      return res.status(400).json({ success: false, error: 'โหมดการแสดงผลไม่ถูกต้อง' })
    }
    const username = req.user?.username || null
    await SiteSetting.set(DISPLAY_MODE_KEY, mode, username)
    res.json({ success: true, data: { mode } })
  } catch (error) {
    console.error('[system] update display-mode error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกโหมดการแสดงผลได้' })
  }
})

router.get('/status', requireAuth, async (_req, res) => {
  try {
    const [disk, memory] = await Promise.all([
      getDiskUsage().catch(() => null),
      Promise.resolve(getMemoryUsage()),
    ])

    const cpu = getCpuLoad()
    const meta = getSystemMeta()

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        disk,
        memory,
        cpu,
        meta,
      },
    })
  } catch (error) {
    console.error('[system] status error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลระบบได้' })
  }
})

router.get('/banned-ips', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const bannedFile = path.resolve(__dirname, '../banned-ips.json')

    if (!fs.existsSync(bannedFile)) {
      return res.json({ success: true, data: [] })
    }

    const data = fs.readFileSync(bannedFile, 'utf-8')
    const bannedIps = JSON.parse(data)

    res.json({ success: true, data: bannedIps })
  } catch (error) {
    console.error('[system] get banned-ips error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงรายชื่อ IP ที่ถูกแบนได้' })
  }
})

// Unban IP Endpoint
import { unbanIp } from '../middleware/botBlocker.js'

router.delete('/banned-ips/:ip', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const ip = req.params.ip
    if (!ip) return res.status(400).json({ success: false, error: 'ระบุ IP Address' })

    const result = unbanIp(ip)

    if (result) {
      res.json({ success: true, message: `ปลดแบน ${ip} เรียบร้อย` })
    } else {
      res.json({ success: false, message: `ไม่พบ IP ${ip} ในรายการ` })
    }
  } catch (error) {
    console.error('[system] unban ip error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถปลดแบนได้' })
  }
})

// Manual Ban Endpoint
import { banIp } from '../middleware/botBlocker.js'

router.post('/banned-ips', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { ip } = req.body

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ip || !ipRegex.test(ip)) {
      return res.status(400).json({ success: false, error: 'รูปแบบ IP Address ไม่ถูกต้อง' })
    }

    // Ban permanently by default for manual bans
    const result = banIp(ip, null)

    if (result) {
      res.json({ success: true, message: `แบน IP ${ip} เรียบร้อย` })
    } else {
      res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกการแบนได้' })
    }
  } catch (error) {
    console.error('[system] manual ban error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถแบนได้' })
  }
})



export default router
