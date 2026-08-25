import { InfographicService } from '../services/InfographicService.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/InfographicDTO.js'
import { userHasPermission } from '../middleware/auth.js'
import { query } from '../database.js'
import { logger } from '../utils/logger.js'

export const InfographicController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const { published, page, limit } = req.query
      const wantAll = published === 'false'
      const isAuthed = Boolean(req.user)
      const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'infographics')

      const whereClause = allowAll ? 'WHERE 1=1' : 'WHERE is_published = TRUE'

      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitVal = parseInt(limit) || 0
      let limitClause = ''
      const params = []

      if (limitVal > 0) {
        limitClause = 'LIMIT ? OFFSET ?'
        params.push(limitVal, (pageNum - 1) * limitVal)

        const countRows = await query(`SELECT COUNT(*) as total FROM infographics ${whereClause}`, [])
        const total = countRows[0]?.total || 0
        res.setHeader('X-Total-Count', total)
        res.setHeader('X-Page', pageNum)
        res.setHeader('X-Per-Page', limitVal)
        res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
      }

      const rows = await query(
        `SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at 
         FROM infographics 
         ${whereClause}
         ORDER BY display_order ASC, created_at DESC
         ${limitClause}`,
        params
      )

      const dtoList = allowAll ? toAdminDTOList : toPublicDTOList

      const rawObjects = rows.map(row => ({
        _id: row.id,
        title: row.title,
        description: '',
        image: { url: `/api/images/infographics/${row.id}` },
        displayOrder: row.display_order,
        order: row.display_order,
        isPublished: Boolean(row.is_published),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      res.json(dtoList(rawObjects))
    } catch (error) {
      logger.error('[InfographicController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch infographics', details: error?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const data = await InfographicService.getInfographicMetadata(req.params.id)
      if (!data) return res.status(404).json({ error: 'Not found' })
      res.json(data)
    } catch (error) {
      logger.error('[InfographicController] show error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const insertId = await InfographicService.createInfographic(req.body, req.file, req.user)
      res.status(201).json({ _id: insertId, message: 'Infographic created successfully' })
    } catch (error) {
      logger.error('[InfographicController] create error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Image file is required') || error.message.includes('Invalid image file')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to create infographic', details: error.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

      await InfographicService.updateInfographic(id, req.body, req.file, req.user)
      res.json({ message: 'Infographic updated successfully' })
    } catch (error) {
      logger.error('[InfographicController] update error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('No fields to update') || error.message.includes('Invalid image file')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to update infographic', details: error.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      await InfographicService.deleteInfographic(req.params.id)
      res.json({ message: 'Infographic deleted successfully' })
    } catch (error) {
      logger.error('[InfographicController] destroy error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to delete infographic', details: error.message })
    }
  },

  async reorder(req, res) {
    try {
      await InfographicService.reorderInfographics(req.body.order)
      res.json({ message: 'Reorder successful' })
    } catch (error) {
      logger.error('[InfographicController] reorder error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Order must be an array of IDs')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to reorder infographics', details: error.message })
    }
  }
}
