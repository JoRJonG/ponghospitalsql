import { SystemService } from '../services/SystemService.js'
import { logger } from '../utils/logger.js'

export const SystemController = {
  async getDisplayMode(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: { mode: 'force-off' } })
    }
    try {
      const mode = await SystemService.getDisplayMode()
      const eTag = `W/"${mode}"`

      if (req.headers['if-none-match'] === eTag) {
        return res.status(304).end()
      }

      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
      res.setHeader('ETag', eTag)
      res.json({ success: true, data: { mode } })
    } catch (error) {
      logger.error('[SystemController] get display-mode error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถดึงโหมดการแสดงผลได้' })
    }
  },

  async updateDisplayMode(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลยังไม่พร้อม' })
    }
    try {
      const mode = await SystemService.updateDisplayMode(req.body?.mode, req.user)
      res.json({ success: true, data: { mode } })
    } catch (error) {
      logger.error('[SystemController] update display-mode error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('โหมดการแสดงผลไม่ถูกต้อง')) {
        return res.status(400).json({ success: false, error: error.message })
      }
      res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกโหมดการแสดงผลได้' })
    }
  },

  async getHeroSliderMode(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: { mode: 'show' } })
    }
    try {
      const mode = await SystemService.getHeroSliderMode()
      const eTag = `W/"${mode}"`

      if (req.headers['if-none-match'] === eTag) {
        return res.status(304).end()
      }

      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
      res.setHeader('ETag', eTag)
      res.json({ success: true, data: { mode } })
    } catch (error) {
      logger.error('[SystemController] get hero-slider-mode error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถดึงสถานะสไลเดอร์หลักได้' })
    }
  },

  async updateHeroSliderMode(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลยังไม่พร้อม' })
    }
    try {
      const mode = await SystemService.updateHeroSliderMode(req.body?.mode, req.user)
      res.json({ success: true, data: { mode } })
    } catch (error) {
      logger.error('[SystemController] update hero-slider-mode error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('สถานะสไลเดอร์ไม่ถูกต้อง')) {
        return res.status(400).json({ success: false, error: error.message })
      }
      res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกสถานะสไลเดอร์หลักได้' })
    }
  },

  async getBannedIps(req, res) {
    try {
      const bannedIps = SystemService.getBannedIps()
      res.json({ success: true, data: bannedIps })
    } catch (error) {
      logger.error('[SystemController] get banned-ips error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถดึงรายชื่อ IP ที่ถูกแบนได้' })
    }
  },

  async banIp(req, res) {
    try {
      SystemService.banIpAddress(req.body?.ip)
      res.json({ success: true, message: `แบน IP ${req.body.ip} เรียบร้อย` })
    } catch (error) {
      logger.error('[SystemController] ban ip error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('รูปแบบ IP Address ไม่ถูกต้อง')) {
        return res.status(400).json({ success: false, error: error.message })
      }
      res.status(500).json({ success: false, error: 'ไม่สามารถแบนได้' })
    }
  },

  async unbanIp(req, res) {
    try {
      SystemService.unbanIpAddress(req.params.ip)
      res.json({ success: true, message: `ปลดแบน ${req.params.ip} เรียบร้อย` })
    } catch (error) {
      logger.error('[SystemController] unban ip error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('ระบุ IP Address')) {
        return res.status(400).json({ success: false, error: error.message })
      }
      res.status(500).json({ success: false, error: 'ไม่สามารถปลดแบนได้' })
    }
  }
}
