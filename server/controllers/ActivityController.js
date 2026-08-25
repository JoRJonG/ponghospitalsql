import { ActivityService } from '../services/ActivityService.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/ActivityDTO.js'
import { logger } from '../utils/logger.js'
import { purgeCachePrefix } from '../middleware/cache.js'

export const ActivityController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json([])
    }

    try {
      const isAuthed = Boolean(req.user)
      const canManage = isAuthed && userHasPermission(req.user, 'activities')
      const { published, status, page, limit, q, sort } = req.query

      // Pagination logic
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitVal = Math.min(parseInt(limit) || 0, 100)
      const options = {
        sort: { publishedAt: -1, updatedAt: -1, createdAt: -1, date: -1 },
        excludeContent: true
      }

      if (sort === 'oldest') {
        options.sort = { publishedAt: 1, updatedAt: 1, createdAt: 1, date: 1 }
      } else if (sort === 'newest') {
        options.sort = { publishedAt: -1, updatedAt: -1, createdAt: -1, date: -1 }
      }

      if (limitVal > 0) {
        options.limit = limitVal
        options.skip = (pageNum - 1) * limitVal
      }

      const { list, total } = await ActivityService.findAll(req.query, options, canManage)

      const filteredList = canManage ? toAdminDTOList(list) : toPublicDTOList(list)

      if (limitVal > 0) {
        res.setHeader('X-Total-Count', total)
        res.setHeader('X-Page', pageNum)
        res.setHeader('X-Per-Page', limitVal)
        res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
      }

      res.json(filteredList)
    } catch (e) {
      logger.error('[ActivityController] index error', { error: e?.message, stack: e?.stack })
      if (/not allowed to do action \[find\]/i.test(e?.message)) {
        return res.status(403).json({ error: 'Permission denied to read activities' })
      }
      res.status(500).json({ error: 'Failed to fetch activities', details: e?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const item = await ActivityService.findById(req.params.id)
      if (!item) return res.status(404).json({ error: 'Not found' })
      // ส่งข้อมูลเต็มสำหรับ detail page (ไม่ใช้ DTO เพราะต้องการข้อมูลครบถ้วน)
      res.json(item)
    } catch (e) {
      if (/not allowed to do action \[find\]/i.test(e?.message)) {
        return res.status(403).json({ error: 'Permission denied to read activities' })
      }
      logger.error('[ActivityController] show error', { error: e?.message })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await ActivityService.createActivity(req.body, req.files, req.user)
      purgeCachePrefix('/api/activities')
      const adminData = toAdminDTO(doc)
      res.status(201).json(adminData)
    } catch (e) {
      logger.error('[ActivityController] create error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to create activity', details: e.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const before = await ActivityService.findById(req.params.id)
      if (!before) return res.status(404).json({ error: 'Not found' })

      const doc = await ActivityService.updateActivity(req.params.id, req.body, req.files, req.user)
      purgeCachePrefix('/api/activities')
      const adminData = toAdminDTO(doc)
      res.json(adminData)
    } catch (e) {
      logger.error('[ActivityController] update error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to update activity', details: e?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await ActivityService.deleteActivity(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      purgeCachePrefix('/api/activities')
      res.json({ ok: true })
    } catch (e) {
      logger.error('[ActivityController] destroy error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to delete activity', details: e?.message })
    }
  }
}
