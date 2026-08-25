import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, infographicSchema } from '../utils/validation.js'
import { InfographicController } from '../controllers/InfographicController.js'

const router = Router()

const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB max
  allowedTypes: 'image'
})

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// Public & Admin List
router.get('/', optionalAuth, InfographicController.index)

// Get single (metadata)
router.get('/:id', optionalAuth, InfographicController.show)

// Create
router.post('/', 
  requireAuth, 
  requirePermission('infographics'), 
  upload.single('image'), 
  validate(infographicSchema),
  InfographicController.create
)

// Update
router.put('/:id', 
  requireAuth, 
  requirePermission('infographics'), 
  upload.single('image'), 
  validate(infographicSchema),
  InfographicController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('infographics'), 
  InfographicController.destroy
)

// Reorder
router.post('/reorder', 
  requireAuth, 
  requirePermission('infographics'), 
  InfographicController.reorder
)

export default router
