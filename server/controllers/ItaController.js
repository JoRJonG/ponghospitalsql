import { ItaService } from '../services/ItaService.js'
import { userHasPermission } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

export const ItaController = {
  async tree(req, res) {
    if (!req.app.locals.dbConnected) return res.json([])
    try {
      const includeUnpublished = !!req.user && userHasPermission(req.user, 'ita')
      const tree = await ItaService.getTree(includeUnpublished)
      res.json(tree)
    } catch (error) {
      logger.error('[ItaController] tree error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch ITA tree', details: error?.message })
    }
  },

  async index(req, res) {
    if (!req.app.locals.dbConnected) return res.json([])
    try {
      const includeUnpublished = !!req.user && userHasPermission(req.user, 'ita')
      const { page, limit } = req.query

      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitVal = parseInt(limit) || 0

      const all = await ItaService.getFlatList(includeUnpublished)

      if (limitVal === 0) {
        return res.json(all)
      }

      const total = all.length
      const start = (pageNum - 1) * limitVal
      const end = start + limitVal
      const sliced = all.slice(start, end)

      res.setHeader('X-Total-Count', total)
      res.setHeader('X-Page', pageNum)
      res.setHeader('X-Per-Page', limitVal)
      res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))

      res.json(sliced)
    } catch (error) {
      logger.error('[ItaController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch ITA items', details: error?.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const id = Number(req.params.id)
      if (!id) return res.status(400).json({ error: 'Bad id' })
      
      const includeUnpublished = !!req.user && userHasPermission(req.user, 'ita')
      const detail = await ItaService.getItemDetail(id, includeUnpublished)
      
      if (!detail) return res.status(404).json({ error: 'Not found' })
      res.json(detail)
    } catch (error) {
      logger.error('[ItaController] show error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch item', details: error?.message })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const item = await ItaService.createItem(req.body)
      res.status(201).json(item)
    } catch (error) {
      logger.error('[ItaController] create error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Create failed', details: error?.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const id = Number(req.params.id)
      const item = await ItaService.updateItem(id, req.body)
      res.json(item)
    } catch (error) {
      logger.error('[ItaController] update error', { error: error?.message, stack: error?.stack })
      if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' })
      res.status(400).json({ error: 'Update failed', details: error?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const id = Number(req.params.id)
      await ItaService.deleteItem(id)
      res.json({ ok: true })
    } catch (error) {
      logger.error('[ItaController] destroy error', { error: error?.message, stack: error?.stack })
      if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' })
      res.status(400).json({ error: 'Delete failed', details: error?.message })
    }
  },

  async reorder(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      await ItaService.reorderItems(req.body.items)
      res.json({ ok: true })
    } catch (error) {
      logger.error('[ItaController] reorder error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Reorder failed', details: error?.message })
    }
  },

  async uploadPdf(req, res) {
    try {
      const result = await ItaService.uploadSinglePdf(req.file, req.body.description)
      res.json(result)
    } catch (error) {
      logger.error('[ItaController] uploadPdf error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Upload failed', details: error?.message })
    }
  },

  async attachPdf(req, res) {
    try {
      const itemId = Number(req.params.id)
      const result = await ItaService.attachItemPdf(itemId, req.file, req.body.description)
      res.json(result)
    } catch (error) {
      logger.error('[ItaController] attachPdf error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Upload failed', details: error?.message })
    }
  },

  async listPdfs(req, res) {
    try {
      const itemId = Number(req.params.id)
      const list = await ItaService.getItemPdfs(itemId)
      res.json(list)
    } catch (error) {
      logger.error('[ItaController] listPdfs error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'List failed', details: error?.message })
    }
  },

  async deletePdf(req, res) {
    try {
      const fileId = Number(req.params.fileId)
      await ItaService.deletePdfFile(fileId)
      res.json({ ok: true })
    } catch (error) {
      logger.error('[ItaController] deletePdf error', { error: error?.message, stack: error?.stack })
      res.status(400).json({ error: 'Delete failed', details: error?.message })
    }
  },

  async servePdf(req, res) {
    try {
      const file = await ItaService.servePdf(req.params.id)
      
      res.setHeader('Content-Type', file.mimetype || 'application/pdf')
      
      const encodeRFC5987 = (str) => encodeURIComponent(str)
        .replace(/['()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
        .replace(/\*/g, '%2A')
        .replace(/%(7C|60|5E)/g, '%25$1')
        
      const fallback = file.filename.replace(/[^\x20-\x7E]/g, '_')
      const cd = `inline; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987(file.filename)}`
      
      res.setHeader('Content-Disposition', cd)
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.send(file.bytes)
    } catch (error) {
      logger.error('[ItaController] servePdf error', { error: error?.message, stack: error?.stack })
      if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' })
      res.status(400).json({ error: 'Read failed', details: error?.message })
    }
  }
}
