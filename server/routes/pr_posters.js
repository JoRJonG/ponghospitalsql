import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, prPosterSchema } from '../utils/validation.js'
import { PRPosterController } from '../controllers/PRPosterController.js'

const router = Router()

const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: 'image'
})

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List
router.get('/', optionalAuth, PRPosterController.index)

// Get single (metadata)
router.get('/:id', optionalAuth, PRPosterController.show)

// Create
router.post('/', 
  requireAuth, 
  requirePermission('pr_poster'), 
  upload.single('image'), 
  validate(prPosterSchema),
  PRPosterController.create
)

// Update
router.put('/:id', 
  requireAuth, 
  requirePermission('pr_poster'), 
  upload.single('image'), 
  validate(prPosterSchema),
  PRPosterController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('pr_poster'), 
  PRPosterController.destroy
)

// Reorder
router.post('/reorder', 
  requireAuth, 
  requirePermission('pr_poster'), 
  PRPosterController.reorder
)

export default router
