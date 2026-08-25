import { ExecutiveService } from '../services/ExecutiveService.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import { logger } from '../utils/logger.js'

export const ExecutiveController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const items = await ExecutiveService.findAll()
      res.json(items)
    } catch (e) {
      logger.error('[ExecutiveController] index error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to fetch executives', details: e?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const item = await ExecutiveService.findById(req.params.id)
      if (!item) return res.status(404).json({ error: 'Not found' })
      res.json(item)
    } catch (e) {
      logger.error('[ExecutiveController] show error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await ExecutiveService.createExecutive(req.body, req.file)
      purgeCachePrefix('/api/executives')
      res.status(201).json(doc)
    } catch (e) {
      logger.error('[ExecutiveController] create error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to create executive', details: e?.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await ExecutiveService.updateExecutive(req.params.id, req.body, req.file)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      
      purgeCachePrefix('/api/executives')
      res.json(doc)
    } catch (e) {
      logger.error('[ExecutiveController] update error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to update executive', details: e?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await ExecutiveService.deleteExecutive(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Not found' })

      purgeCachePrefix('/api/executives')
      res.json({ ok: true })
    } catch (e) {
      logger.error('[ExecutiveController] destroy error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to delete executive', details: e?.message })
    }
  },

  async reorder(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const { orderMap } = req.body
      if (!orderMap || typeof orderMap !== 'object') {
        return res.status(400).json({ error: 'Invalid orderMap' })
      }

      await ExecutiveService.updateDisplayOrders(orderMap)
      purgeCachePrefix('/api/executives')
      res.json({ success: true })
    } catch (e) {
      logger.error('[ExecutiveController] reorder error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to reorder executives', details: e?.message })
    }
  }
}
