import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, documentSchema } from '../utils/validation.js'
import { DocumentController } from '../controllers/DocumentController.js'

const router = Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// Multer configuration for file upload
const upload = createUploadMiddleware({
    maxSize: 50 * 1024 * 1024 // 50MB
})

const uploadSingleMdw = (fieldName) => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large', details: 'File must be 50MB or smaller' })
                }
                return res.status(400).json({ error: err.message || 'Upload error' })
            }
            next()
        })
    }
}

router.get('/', optionalAuth, DocumentController.index)
router.get('/categories', DocumentController.categories)
router.get('/:id', optionalAuth, DocumentController.show)
router.get('/:id/download', DocumentController.download)

router.post('/', 
    requireAuth, 
    requirePermission('documents'), 
    uploadSingleMdw('file'), 
    validate(documentSchema),
    DocumentController.create
)

router.put('/:id', 
    requireAuth, 
    requirePermission('documents'), 
    uploadSingleMdw('file'), 
    validate(documentSchema),
    DocumentController.update
)

router.delete('/:id', 
    requireAuth, 
    requirePermission('documents'), 
    DocumentController.destroy
)

export default router
