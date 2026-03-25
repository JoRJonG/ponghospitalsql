import { Router } from 'express'
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js'
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

    // ตั้งค่า ETag จากตัวอักษรของ mode
    const eTag = `W/"${mode}"`

    // ถ้า client มีข้อมูลล่าสุดอยู่แล้ว (ETag ตรงกัน) ให้ส่ง 304 Not Modified กลับไปเลย
    if (req.headers['if-none-match'] === eTag) {
      return res.status(304).end()
    }

    // กำหนดให้ cache ฝั่งบราวเซอร์ใช้ได้ แต่ต้องถามเซิร์ฟเวอร์ก่อนใช้เสมอ (Revalidation)
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.setHeader('ETag', eTag)
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

// === Hero Slider Mode ===
const HERO_SLIDER_MODE_KEY = 'hero_slider_visible'
const DEFAULT_HERO_SLIDER_MODE = 'show' // Default is to show the slider
const ALLOWED_HERO_SLIDER_MODES = new Set(['show', 'hide'])

router.get('/hero-slider-mode', async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: { mode: DEFAULT_HERO_SLIDER_MODE } })
    }
    const raw = await SiteSetting.get(HERO_SLIDER_MODE_KEY)
    const mode = ALLOWED_HERO_SLIDER_MODES.has(raw) ? raw : DEFAULT_HERO_SLIDER_MODE

    // ตั้งค่า ETag จากตัวอักษรของ mode
    const eTag = `W/"${mode}"`

    // ถ้า client มีข้อมูลล่าสุดอยู่แล้ว (ETag ตรงกัน) ให้ส่ง 304 Not Modified กลับไปเลย
    if (req.headers['if-none-match'] === eTag) {
      return res.status(304).end()
    }

    // กำหนดให้ cache ฝั่งบราวเซอร์ใช้ได้ แต่ต้องถามเซิร์ฟเวอร์ก่อนใช้เสมอ (Revalidation)
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.setHeader('ETag', eTag)
    res.json({ success: true, data: { mode } })
  } catch (error) {
    console.error('[system] hero-slider-mode error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงสถานะสไลเดอร์หลักได้' })
  }
})

router.put('/hero-slider-mode', requireAuth, requirePermission('system'), async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลยังไม่พร้อม' })
    }
    const mode = typeof req.body?.mode === 'string' ? req.body.mode.trim() : ''
    if (!ALLOWED_HERO_SLIDER_MODES.has(mode)) {
      return res.status(400).json({ success: false, error: 'สถานะสไลเดอร์ไม่ถูกต้อง' })
    }
    const username = req.user?.username || null
    await SiteSetting.set(HERO_SLIDER_MODE_KEY, mode, username)
    res.json({ success: true, data: { mode } })
  } catch (error) {
    console.error('[system] update hero-slider-mode error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกสถานะสไลเดอร์หลักได้' })
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
