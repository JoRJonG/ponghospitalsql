import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getCpuLoad, getDiskUsage, getMemoryUsage, getSystemMeta } from '../utils/systemInfo.js'
import SiteSetting from '../models/mysql/SiteSetting.js'

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
    res.json({ success: true, data: { mode } })
  } catch (error) {
    console.error('[system] display-mode error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงโหมดการแสดงผลได้' })
  }
})

router.put('/display-mode', requireAuth, requireRole('admin'), async (req, res) => {
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

router.get('/status', requireAuth, requireRole('admin'), async (_req, res) => {
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

export default router
