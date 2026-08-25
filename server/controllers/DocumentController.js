import { DocumentService } from '../services/DocumentService.js'
import { userHasPermission } from '../middleware/auth.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/DocumentDTO.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import { logger } from '../utils/logger.js'

export const DocumentController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const isAdmin = userHasPermission(req.user, 'documents')
      const { docs, total, pageNum, limitNum } = await DocumentService.findAll(req.query, isAdmin)

      const result = isAdmin ? toAdminDTOList(docs) : toPublicDTOList(docs)

      res.json({
        data: result,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    } catch (e) {
      logger.error('[DocumentController] index error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to fetch documents' })
    }
  },

  async categories(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const categories = await DocumentService.getCategories()
      res.json(categories)
    } catch (e) {
      logger.error('[DocumentController] categories error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to fetch categories' })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const isAdmin = userHasPermission(req.user, 'documents')
      const doc = await DocumentService.findById(req.params.id, isAdmin)

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' })
      }

      const result = isAdmin ? toAdminDTO(doc) : toPublicDTO(doc)
      res.json(result)
    } catch (e) {
      logger.error('[DocumentController] show error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to fetch document' })
    }
  },

  async download(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const downloadInfo = await DocumentService.getDownloadInfo(req.params.id)
      if (!downloadInfo) {
        return res.status(404).json({ error: 'File or document not found' })
      }

      res.setHeader('Content-Type', downloadInfo.mimeType)
      res.setHeader('Content-Disposition', downloadInfo.contentDispositionHeader)
      res.sendFile(downloadInfo.filePath)
    } catch (e) {
      logger.error('[DocumentController] download error', { error: e?.message, stack: e?.stack })
      res.status(500).json({ error: 'Failed to download document' })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const doc = await DocumentService.createDocument(req.body, req.file, req.user)
      
      purgeCachePrefix('/api/documents')
      const createdDoc = await DocumentService.findById(doc.id, true)
      res.status(201).json(toAdminDTO(createdDoc))
    } catch (e) {
      logger.error('[DocumentController] create error', { error: e?.message, stack: e?.stack })
      if (e.message.includes('ขนาดไฟล์เกินกำหนด') || e.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ 
          error: e.code === 'INVALID_FILE_TYPE' ? 'Invalid file type' : e.message,
          details: e.code === 'INVALID_FILE_TYPE' ? 'Only PDF, DOC, DOCX, XLS, XLSX files are allowed' : undefined
        })
      }
      res.status(400).json({ error: 'Failed to create document', details: e.message })
    }
  },

  async update(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const updatedDoc = await DocumentService.updateDocument(req.params.id, req.body, req.file, req.user)
      if (!updatedDoc) {
        return res.status(404).json({ error: 'Document not found' })
      }

      purgeCachePrefix('/api/documents')
      res.json(toAdminDTO(updatedDoc))
    } catch (e) {
      logger.error('[DocumentController] update error', { error: e?.message, stack: e?.stack })
      if (e.message.includes('Document not found')) {
        return res.status(404).json({ error: 'Document not found' })
      }
      if (e.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'Invalid file type',
          details: 'Only PDF, DOC, DOCX, XLS, XLSX files are allowed'
        })
      }
      res.status(400).json({ error: 'Failed to update document' })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }
    try {
      const result = await DocumentService.deleteDocument(req.params.id)
      if (!result) {
        return res.status(404).json({ error: 'Document not found' })
      }

      purgeCachePrefix('/api/documents')
      res.json({ ok: true })
    } catch (e) {
      logger.error('[DocumentController] destroy error', { error: e?.message, stack: e?.stack })
      if (e.message === 'Document not found') {
        return res.status(404).json({ error: 'Document not found' })
      }
      res.status(500).json({ error: 'Failed to delete document' })
    }
  }
}
