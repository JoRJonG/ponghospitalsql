import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, slideSchema } from '../utils/validation.js'
import { SlideController } from '../controllers/SlideController.js'

const router = Router()

// Configure multer to store files in disk
const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB max
  allowedTypes: 'image'
})

// Small burst limiter
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List slides
router.get('/', optionalAuth, microCache(5_000, 60), SlideController.index)

// Get one slide
router.get('/:id', microCache(60_000), SlideController.show)

// Get slide count
router.get('/count', optionalAuth, SlideController.count)

// Create with file upload
router.post('/', 
  requireAuth, 
  requirePermission('slides'), 
  upload.single('image'), 
  validate(slideSchema),
  SlideController.create
)

// Update with optional file upload
router.put('/:id', 
  requireAuth, 
  requirePermission('slides'), 
  upload.single('image'), 
  validate(slideSchema),
  SlideController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('slides'), 
  SlideController.destroy
)

// Bulk reorder slides
router.post('/reorder', 
  requireAuth, 
  requirePermission('slides'), 
  SlideController.reorder
)

export default router
