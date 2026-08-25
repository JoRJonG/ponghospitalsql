import { UserService } from '../services/UserService.js'
import { toPublicUserDTO } from '../dto/UserDTO.js'
import { logger } from '../utils/logger.js'

export const UserController = {
  async index(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20))

      const { users, total, totalPages } = await UserService.findAll(page, limit)

      res.setHeader('X-Total-Count', total)
      res.setHeader('X-Total-Pages', totalPages)
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Total-Pages')

      res.json({ success: true, data: users.map(toPublicUserDTO) })
    } catch (error) {
      logger.error('[UserController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ success: false, error: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้: ' + error.message })
    }
  },

  async create(req, res) {
    try {
      const created = await UserService.createUser(req.body)
      res.status(201).json({ success: true, data: toPublicUserDTO(created) })
    } catch (error) {
      logger.error('[UserController] create error', { error: error?.message, stack: error?.stack })
      
      const statusCode = error.message.includes('มีชื่อผู้ใช้นี้อยู่แล้ว') ? 409 : 400
      const isSystemError = !error.message.includes('กรุณา') && !error.message.includes('รหัสผ่าน') && !error.message.includes('มีชื่อ')
      
      if (isSystemError) {
        res.status(500).json({ success: false, error: 'ไม่สามารถสร้างผู้ใช้ได้' })
      } else {
        res.status(statusCode).json({ success: false, error: error.message })
      }
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id)
      if (!id) return res.status(400).json({ success: false, error: 'รหัสผู้ใช้ไม่ถูกต้อง' })

      const updated = await UserService.updateUser(id, req.body, req.user)
      res.json({ success: true, data: toPublicUserDTO(updated) })
    } catch (error) {
      logger.error('[UserController] update error', { error: error?.message, stack: error?.stack })
      
      if (error.message.includes('ไม่พบบัญชีผู้ใช้')) {
        return res.status(404).json({ success: false, error: error.message })
      }

      const isSystemError = !error.message.includes('ไม่สามารถ') && !error.message.includes('รหัสผ่าน') && !error.message.includes('ต้องมี')
      if (isSystemError) {
        res.status(500).json({ success: false, error: 'ไม่สามารถอัปเดตผู้ใช้ได้' })
      } else {
        res.status(400).json({ success: false, error: error.message })
      }
    }
  },

  async destroy(req, res) {
    try {
      const id = Number(req.params.id)
      if (!id) return res.status(400).json({ success: false, error: 'รหัสผู้ใช้ไม่ถูกต้อง' })

      await UserService.deleteUser(id, req.user)
      res.json({ success: true })
    } catch (error) {
      logger.error('[UserController] destroy error', { error: error?.message, stack: error?.stack })
      
      if (error.message.includes('ไม่พบบัญชีผู้ใช้')) {
        return res.status(404).json({ success: false, error: error.message })
      }

      const isSystemError = !error.message.includes('ไม่สามารถ') && !error.message.includes('ต้องมี')
      if (isSystemError) {
        res.status(500).json({ success: false, error: 'ไม่สามารถลบบัญชีผู้ใช้ได้' })
      } else {
        res.status(400).json({ success: false, error: error.message })
      }
    }
  }
}
