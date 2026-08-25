import { Router } from 'express'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { createUploadMiddleware } from '../middleware/upload.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { microCache } from '../middleware/cache.js'
import { validate, itaSchema } from '../utils/validation.js'
import { ItaController } from '../controllers/ItaController.js'

const MAX_PDF_FILE_SIZE = 300 * 1024 * 1024
const router = Router()
router.use(createRateLimiter({ windowMs: 10_000, max: 60 }))

const upload = createUploadMiddleware({ maxSize: MAX_PDF_FILE_SIZE })

function multerUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const sizeMb = Math.round(MAX_PDF_FILE_SIZE / (1024 * 1024))
        return res.status(400).json({ error: 'File too large', details: `File must be ${sizeMb}MB or smaller` })
      }
      return next(err)
    }
    next()
  })
}

// Tree and List
router.get('/tree', optionalAuth, microCache(15_000), ItaController.tree)
router.get('/', optionalAuth, microCache(15_000), ItaController.index)
router.get('/item/:id', optionalAuth, microCache(10_000), ItaController.show)

// Manage Items
router.post('/', requireAuth, requirePermission('ita'), validate(itaSchema), ItaController.create)
router.put('/:id', requireAuth, requirePermission('ita'), validate(itaSchema), ItaController.update)
router.delete('/:id', requireAuth, requirePermission('ita'), ItaController.destroy)
router.post('/reorder', requireAuth, requirePermission('ita'), ItaController.reorder)

// Manage PDFs
router.post('/upload/pdf', requireAuth, requirePermission('ita'), multerUploadMiddleware, ItaController.uploadPdf)
router.post('/:id/pdf', requireAuth, requirePermission('ita'), multerUploadMiddleware, ItaController.attachPdf)
router.get('/:id/pdfs', optionalAuth, ItaController.listPdfs)
router.delete('/pdf/file/:fileId', requireAuth, requirePermission('ita'), ItaController.deletePdf)

// Serve PDF
router.get('/pdf/:id', ItaController.servePdf)

export default router