import { PRPosterService } from '../services/PRPosterService.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/PRPosterDTO.js'
import { userHasPermission } from '../middleware/auth.js'
import { query } from '../database.js'
import { logger } from '../utils/logger.js'

export const PRPosterController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const { published, page, limit } = req.query
      const wantAll = published === 'false'
      const isAuthed = Boolean(req.user)
      const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'pr_poster')

      const whereClause = allowAll ? 'WHERE 1=1' : 'WHERE is_published = TRUE'

      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitVal = parseInt(limit) || 0
      let limitClause = ''
      const params = []

      if (limitVal > 0) {
        limitClause = 'LIMIT ? OFFSET ?'
        params.push(limitVal, (pageNum - 1) * limitVal)

        const countRows = await query(`SELECT COUNT(*) as total FROM pr_posters ${whereClause}`, [])
        const total = countRows[0]?.total || 0
        res.setHeader('X-Total-Count', total)
        res.setHeader('X-Page', pageNum)
        res.setHeader('X-Per-Page', limitVal)
        res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
      }

      const rows = await query(
        `SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at 
         FROM pr_posters 
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
        image: { url: `/api/images/pr-posters/${row.id}?t=${new Date(row.updated_at).getTime()}` },
        displayOrder: row.display_order,
        order: row.display_order,
        isPublished: Boolean(row.is_published),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      res.json(dtoList(rawObjects))
    } catch (error) {
      logger.error('[PRPosterController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch PR posters', details: error?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const data = await PRPosterService.getMetadata(req.params.id)
      if (!data) return res.status(404).json({ error: 'Not found' })
      res.json(data)
    } catch (error) {
      logger.error('[PRPosterController] show error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const insertId = await PRPosterService.createPoster(req.body, req.file, req.user)
      res.status(201).json({ _id: insertId, message: 'PR Poster created successfully' })
    } catch (error) {
      logger.error('[PRPosterController] create error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Image file is required') || error.message.includes('Invalid image file')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to create poster', details: error.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

      await PRPosterService.updatePoster(id, req.body, req.file, req.user)
      res.json({ message: 'PR Poster updated successfully' })
    } catch (error) {
      logger.error('[PRPosterController] update error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('No fields to update') || error.message.includes('Invalid image file')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to update poster', details: error.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      await PRPosterService.deletePoster(req.params.id)
      res.json({ message: 'PR Poster deleted successfully' })
    } catch (error) {
      logger.error('[PRPosterController] destroy error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Poster not found')) {
        return res.status(404).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to delete poster', details: error.message })
    }
  },

  async reorder(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      await PRPosterService.reorderPosters(req.body.order, req.body.startOrder)
      res.json({ message: 'Reorder successfully' })
    } catch (error) {
      logger.error('[PRPosterController] reorder error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Order must be an array of IDs')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to reorder', details: error.message })
    }
  }
}
