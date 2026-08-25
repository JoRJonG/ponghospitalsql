import { OrganizationService } from '../services/OrganizationService.js'
import { toOrganizationChartDTO } from '../dto/OrganizationChartDTO.js'
import { userHasPermission } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

export const OrganizationController = {
  async index(req, res) {
    try {
      const wantAll = req.query.published === 'false'
      const canViewAll = req.user && (userHasPermission(req.user, 'organization') || userHasPermission(req.user, 'admin'))

      const rows = await OrganizationService.findAll(wantAll && canViewAll)
      const data = rows.map(toOrganizationChartDTO)

      res.json(data)
    } catch (error) {
      logger.error('[OrganizationController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch organization charts' })
    }
  },

  async create(req, res) {
    try {
      await OrganizationService.createChart(req.body, req.file, req.user)
      res.status(201).json({ success: true, message: 'Created successfully' })
    } catch (error) {
      logger.error('[OrganizationController] create error', { error: error?.message, stack: error?.stack })
      const isSystemError = !error.message.includes('Image is required') && !error.message.includes('Invalid image file')
      if (isSystemError) {
        res.status(500).json({ error: 'Failed to create' })
      } else {
        res.status(400).json({ error: error.message })
      }
    }
  },

  async update(req, res) {
    try {
      await OrganizationService.updateChart(req.params.id, req.body, req.file, req.user)
      res.json({ success: true, message: 'Updated successfully' })
    } catch (error) {
      logger.error('[OrganizationController] update error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Not found')) {
        return res.status(404).json({ error: 'Not found' })
      }
      const isSystemError = !error.message.includes('Invalid image file')
      if (isSystemError) {
        res.status(500).json({ error: 'Failed to update' })
      } else {
        res.status(400).json({ error: error.message })
      }
    }
  },

  async destroy(req, res) {
    try {
      await OrganizationService.deleteChart(req.params.id)
      res.json({ success: true, message: 'Deleted successfully' })
    } catch (error) {
      logger.error('[OrganizationController] destroy error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Not found')) {
        return res.status(404).json({ error: 'Not found' })
      }
      res.status(500).json({ error: 'Failed to delete' })
    }
  },

  async reorder(req, res) {
    try {
      await OrganizationService.reorderCharts(req.body.order)
      res.json({ success: true })
    } catch (error) {
      logger.error('[OrganizationController] reorder error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('Invalid order data')) {
        return res.status(400).json({ error: 'Invalid order data' })
      }
      res.status(500).json({ error: 'Reorder failed' })
    }
  }
}
