import { AnnouncementService } from '../services/AnnouncementService.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/AnnouncementDTO.js'
import { logger } from '../utils/logger.js'
import { purgeCachePrefix } from '../middleware/cache.js'

export const AnnouncementController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json([])
    }

    try {
      const isAuthed = Boolean(req.user)
      const canManage = isAuthed && userHasPermission(req.user, 'announcements')
      const { category, published, status, page, limit, q, sort } = req.query

      // Pagination logic
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitVal = Math.min(parseInt(limit) || 0, 100)
      const options = {
        sort: { publishedAt: -1, createdAt: -1 }
      }

      if (sort === 'oldest') {
        options.sort = { publishedAt: 1, createdAt: 1 }
      } else if (sort === 'newest') {
        options.sort = { publishedAt: -1, createdAt: -1 }
      }

      if (limitVal > 0) {
        options.limit = limitVal
        options.skip = (pageNum - 1) * limitVal
      }

      const { list, total } = await AnnouncementService.findAll(req.query, options, canManage)

      const filteredList = canManage ? toAdminDTOList(list) : toPublicDTOList(list)

      if (limitVal > 0) {
        res.setHeader('X-Total-Count', total)
        res.setHeader('X-Page', pageNum)
        res.setHeader('X-Per-Page', limitVal)
        res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
      }

      res.json(filteredList)
    } catch (e) {
      logger.error('[AnnouncementController] index error', { error: e?.message, stack: e?.stack })
      if (/not allowed to do action \[find\]/i.test(e?.message)) {
        return res.status(403).json({ error: 'Permission denied to read announcements' })
      }
      res.status(500).json({ error: 'Failed to fetch announcements', details: e?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const item = await AnnouncementService.findById(req.params.id)
      if (!item) return res.status(404).json({ error: 'Not found' })
      res.json(item)
    } catch (e) {
      if (/not allowed to do action \[find\]/i.test(e?.message)) {
        return res.status(403).json({ error: 'Permission denied to read announcements' })
      }
      logger.error('[AnnouncementController] show error', { error: e?.message })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      // Build payload from either JSON body (when not multipart) or form fields
      let payload = {}
      if (req.is('multipart/*')) {
        try {
          if (req.body && req.body.payload) {
            payload = JSON.parse(req.body.payload)
          } else {
            payload = { ...req.body }
          }
        } catch (e) {
          logger.warn('Failed to parse multipart payload JSON', { error: e?.message })
          payload = { ...req.body }
        }
      } else {
        payload = { ...req.body }
      }

      const doc = await AnnouncementService.createAnnouncement(payload, req.files, req.user)
      purgeCachePrefix('/api/announcements')
      const adminData = toAdminDTO(doc)
      res.status(201).json(adminData)
    } catch (e) {
      logger.error('[AnnouncementController] create error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to create announcement', details: e.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const before = await AnnouncementService.findById(req.params.id)
      if (!before) return res.status(404).json({ error: 'Not found' })

      const doc = await AnnouncementService.updateAnnouncement(req.params.id, req.body, req.user)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      
      purgeCachePrefix('/api/announcements')
      const adminData = toAdminDTO(doc)
      res.json(adminData)
    } catch (e) {
      logger.error('[AnnouncementController] update error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to update announcement', details: e?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await AnnouncementService.deleteAnnouncement(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      purgeCachePrefix('/api/announcements')
      res.json({ ok: true })
    } catch (e) {
      logger.error('[AnnouncementController] destroy error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to delete announcement', details: e?.message })
    }
  },

  async uploadAttachment(req, res) {
    try {
      const announcementId = Number(req.params.id)
      if (!announcementId) return res.status(400).json({ error: 'Invalid announcement id' })
      if (!req.file) return res.status(400).json({ error: 'No file' })

      const result = await AnnouncementService.addAttachment(announcementId, req.file)
      purgeCachePrefix('/api/announcements')
      res.json(result)
    } catch (e) {
      logger.error('[AnnouncementController] uploadAttachment error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Upload failed', details: e?.message })
    }
  }
}
