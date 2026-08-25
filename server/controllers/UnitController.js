import { UnitService } from '../services/UnitService.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTOList, toAdminDTOList } from '../dto/UnitDTO.js'
import { logger } from '../utils/logger.js'

export const UnitController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) return res.json([])

    try {
      const isAuthed = Boolean(req.user)
      const canManage = isAuthed && userHasPermission(req.user, 'units')

      const { list, pageNum, limitVal, total } = await UnitService.getUnitList(req.query, canManage)
      
      const filteredList = canManage ? toAdminDTOList(list) : toPublicDTOList(list)

      if (limitVal > 0 && total > 0) {
        res.setHeader('X-Total-Count', total)
        res.setHeader('X-Page', pageNum)
        res.setHeader('X-Per-Page', limitVal)
        res.setHeader('X-Total-Pages', Math.ceil(total / limitVal))
      }

      res.json(filteredList)
    } catch (error) {
      logger.error('[UnitController] index error:', error)
      const msg = String(error?.message || '')
      if (/not allowed to do action \[find\]/i.test(msg)) {
        return res.status(403).json({ error: 'Permission denied to read units' })
      }
      res.status(500).json({ error: 'Failed to fetch units' })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const doc = await UnitService.getUnitById(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Not found' })
      res.json(doc)
    } catch (error) {
      logger.error('[UnitController] show error:', error)
      const msg = String(error?.message || '')
      if (/not allowed to do action \[find\]/i.test(msg)) {
        return res.status(403).json({ error: 'Permission denied to read units' })
      }
      res.status(400).json({ error: 'Invalid ID' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const doc = await UnitService.createUnit(req.body, req.file)
      res.status(201).json(doc)
    } catch (error) {
      logger.error('[UnitController] create error:', error)
      res.status(400).json({ error: 'Failed to create unit', details: error?.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const doc = await UnitService.updateUnit(req.params.id, req.body, req.file)
      res.json(doc)
    } catch (error) {
      logger.error('[UnitController] update error:', error)
      if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' })
      res.status(400).json({ error: 'Failed to update unit', details: error?.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      await UnitService.deleteUnit(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      logger.error('[UnitController] destroy error:', error)
      if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' })
      res.status(400).json({ error: 'Failed to delete unit', details: error?.message })
    }
  }
}
