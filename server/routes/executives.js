import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, executiveSchema } from '../utils/validation.js'
import { ExecutiveController } from '../controllers/ExecutiveController.js'

const router = Router()

// Configure multer for file uploads
const upload = createUploadMiddleware({
  maxSize: 5 * 1024 * 1024, // 5MB max
  allowedTypes: 'image'
})

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List executives
router.get('/', optionalAuth, microCache(30_000), ExecutiveController.index)

// Get one executive
router.get('/:id', microCache(60_000), ExecutiveController.show)

// Create executive
router.post('/', 
  requireAuth, 
  requirePermission('executives'), 
  upload.single('image'), 
  validate(executiveSchema),
  ExecutiveController.create
)

// Update executive
router.put('/:id', 
  requireAuth, 
  requirePermission('executives'), 
  (req, res, next) => {
    // Support both JSON and multipart/form-data
    const contentType = req.get('Content-Type') || ''
    if (contentType.includes('multipart/form-data')) {
      return upload.single('image')(req, res, next)
    }
    next()
  },
  validate(executiveSchema),
  ExecutiveController.update
)

// Update display orders
router.post('/reorder', 
  requireAuth, 
  requirePermission('executives'), 
  ExecutiveController.reorder
)

// Delete executive
router.delete('/:id', 
  requireAuth, 
  requirePermission('executives'), 
  ExecutiveController.destroy
)

export default router
