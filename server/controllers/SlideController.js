import { SlideService } from '../services/SlideService.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/SlideDTO.js'
import { logger } from '../utils/logger.js'

export const SlideController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json([])
    }
    try {
      // List slides, using DTO based on auth
      const list = await SlideService.findAll()
      const isAdmin = Boolean(req.user)
      const data = isAdmin ? toAdminDTOList(list) : toPublicDTOList(list)
      res.json(data)
    } catch (e) {
      logger.error('[SlideController] index error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to fetch slides', details: e?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await SlideService.findById(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      res.json(doc)
    } catch (e) {
      logger.error('[SlideController] show error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await SlideService.createSlide(req.body, req.file)
      const adminData = toAdminDTO(doc)
      res.status(201).json(adminData)
    } catch (e) {
      logger.error('[SlideController] create error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to create slide', details: e?.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await SlideService.updateSlide(req.params.id, req.body, req.file)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      
      const adminData = toAdminDTO(doc)
      res.json(adminData)
    } catch (e) {
      logger.error('[SlideController] update error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to update slide', details: e?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const deleted = await SlideService.deleteSlide(req.params.id)
      if (!deleted) return res.status(404).json({ error: 'Not found' })
      res.json({ ok: true })
    } catch (e) {
      logger.error('[SlideController] destroy error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to delete slide', details: e?.message })
    }
  },

  async reorder(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const items = Array.isArray(req.body) ? req.body : []
      const modified = await SlideService.reorderSlides(items)
      res.json({ ok: true, modified })
    } catch (e) {
      logger.error('[SlideController] reorder error', { error: e?.message, stack: e?.stack })
      res.status(400).json({ error: 'Failed to reorder slides', details: e?.message })
    }
  },

  async count(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.json({ count: 0 })
    }
    try {
      const count = await SlideService.countDocuments()
      res.json({ count })
    } catch (e) {
      logger.error('[SlideController] count error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to count slides' })
    }
  }
}
