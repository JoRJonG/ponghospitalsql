import { PopupService } from '../services/PopupService.js'
import { toPublicDTOList, toAdminDTOList, toAdminDTO } from '../dto/PopupDTO.js'
import { logger } from '../utils/logger.js'

export const PopupController = {
  async getActive(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: [] })
    }
    try {
      const popups = await PopupService.getActivePopups()
      const publicData = toPublicDTOList(popups)
      res.json({ success: true, data: publicData })
    } catch (error) {
      logger.error('[PopupController] getActive error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถโหลดป๊อปอัปได้' })
    }
  },

  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json({ success: true, data: [] })
    }
    try {
      const popups = await PopupService.getAllPopups()
      const adminData = toAdminDTOList(popups)
      res.json({ success: true, data: adminData })
    } catch (error) {
      logger.error('[PopupController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถโหลดข้อมูลป๊อปอัปได้' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
    }
    try {
      const created = await PopupService.createPopup(req.body, req.file)
      const adminData = toAdminDTO(created)
      res.status(201).json({ success: true, data: adminData })
    } catch (error) {
      logger.error('[PopupController] create error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ success: false, error: error?.message || 'ไม่สามารถสร้างป๊อปอัปได้' })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
    }
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'รหัสไม่ถูกต้อง' })
    }
    try {
      const updated = await PopupService.updatePopup(id, req.body, req.file)
      const adminData = toAdminDTO(updated)
      res.json({ success: true, data: adminData })
    } catch (error) {
      logger.error('[PopupController] update error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('ไม่พบป๊อปอัป')) {
        return res.status(404).json({ success: false, error: error.message })
      }
      res.status(400).json({ success: false, error: error?.message || 'ไม่สามารถปรับปรุงป๊อปอัปได้' })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
    }
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'รหัสไม่ถูกต้อง' })
    }
    try {
      await PopupService.deletePopup(id)
      res.json({ success: true })
    } catch (error) {
      logger.error('[PopupController] destroy error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('ไม่พบป๊อปอัป')) {
        return res.status(404).json({ success: false, error: error.message })
      }
      res.status(400).json({ success: false, error: 'ไม่สามารถลบป๊อปอัปได้' })
    }
  }
}
