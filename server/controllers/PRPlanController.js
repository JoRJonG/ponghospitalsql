import { PRPlanService } from '../services/PRPlanService.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/PRPlanDTO.js'
import { userHasPermission } from '../middleware/auth.js'
import { contentDisposition } from '../utils/filename.js'
import { logger } from '../utils/logger.js'

export const PRPlanController = {
  async index(req, res) {
    try {
      const { search, page = 1, limit = 20, isPublished } = req.query
      const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)

      let isPublishedFilter
      if (isAdmin) {
        if (isPublished !== undefined) {
          isPublishedFilter = isPublished === 'true'
        }
      } else {
        isPublishedFilter = true
      }

      const filters = {
        search,
        page: pageNum,
        limit: limitNum,
        isPublished: isPublishedFilter,
        excludeContent: true
      }

      const { plans, total } = await PRPlanService.findAll(filters)
      const result = isAdmin ? toAdminDTOList(plans) : toPublicDTOList(plans)

      res.json({
        data: result,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    } catch (error) {
      logger.error('[PRPlanController] index error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch PR plans' })
    }
  },

  async show(req, res) {
    try {
      const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')
      const plan = await PRPlanService.findById(req.params.id, isAdmin)
      if (!plan) {
        return res.status(404).json({ error: 'PR Plan not found' })
      }
      res.json(plan)
    } catch (error) {
      logger.error('[PRPlanController] show error', { error: error?.message, stack: error?.stack })
      res.status(500).json({ error: 'Failed to fetch PR plan' })
    }
  },

  async viewInline(req, res) {
    try {
      const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')
      const file = await PRPlanService.getFile(req.params.id, isAdmin)
      
      res.setHeader('Content-Type', file.fileInfo.mime_type || 'application/pdf')
      res.setHeader('Content-Disposition', contentDisposition('inline', file.fileInfo.file_name))
      res.sendFile(file.filePath)
    } catch (error) {
      logger.error('[PRPlanController] view error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'File not found' })
      }
      res.status(500).json({ error: 'Failed to view PR plan' })
    }
  },

  async download(req, res) {
    try {
      const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')
      const file = await PRPlanService.downloadFile(req.params.id, isAdmin)

      res.setHeader('Content-Type', file.fileInfo.mime_type || 'application/pdf')
      res.setHeader('Content-Disposition', contentDisposition('attachment', file.fileInfo.file_name))
      res.sendFile(file.filePath)
    } catch (error) {
      logger.error('[PRPlanController] download error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'File not found' })
      }
      res.status(500).json({ error: 'Failed to download PR plan' })
    }
  },

  async create(req, res) {
    try {
      const createdPlan = await PRPlanService.createPlan(req.body, req.file, req.user)
      res.status(201).json(toAdminDTO(createdPlan))
    } catch (error) {
      logger.error('[PRPlanController] create error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('No file uploaded') || error.message.includes('Title is required') || error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message })
      }
      if (error.message.includes('ขนาดไฟล์เกินกำหนด')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to create PR plan', details: error.message })
    }
  },

  async update(req, res) {
    try {
      const updatedPlan = await PRPlanService.updatePlan(req.params.id, req.body, req.file, req.user)
      res.json(toAdminDTO(updatedPlan))
    } catch (error) {
      logger.error('[PRPlanController] update error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'PR Plan not found' })
      }
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to update PR plan' })
    }
  },

  async destroy(req, res) {
    try {
      await PRPlanService.deletePlan(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      logger.error('[PRPlanController] destroy error', { error: error?.message, stack: error?.stack })
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'PR Plan not found' })
      }
      res.status(500).json({ error: 'Failed to delete PR plan' })
    }
  }
}
