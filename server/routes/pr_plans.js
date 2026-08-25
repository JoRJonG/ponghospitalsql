import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, prPlanSchema } from '../utils/validation.js'
import { PRPlanController } from '../controllers/PRPlanController.js'

const router = Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

const upload = createUploadMiddleware({
  maxSize: 50 * 1024 * 1024 // 50MB
})

// Public & Admin List
router.get('/', optionalAuth, PRPlanController.index)

// Get single (metadata)
router.get('/:id', optionalAuth, PRPlanController.show)

// View inline (PDF)
router.get(['/:id/view', '/:id/view/:filename'], optionalAuth, PRPlanController.viewInline)

// Download (PDF)
router.get(['/:id/download', '/:id/download/:filename'], optionalAuth, PRPlanController.download)

// Create
router.post('/', 
  requireAuth, 
  requirePermission('pr_plan'), 
  upload.single('file'), 
  validate(prPlanSchema),
  PRPlanController.create
)

// Update
router.put('/:id', 
  requireAuth, 
  requirePermission('pr_plan'), 
  upload.single('file'), 
  validate(prPlanSchema),
  PRPlanController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('pr_plan'), 
  PRPlanController.destroy
)

export default router
