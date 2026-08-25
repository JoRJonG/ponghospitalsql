import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, requirePermission, optionalAuth } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { microCache } from '../middleware/cache.js'
import { validate, popupSchema } from '../utils/validation.js'
import { PopupController } from '../controllers/PopupController.js'

const router = Router()

// Light burst limiter to protect DB
router.use(createRateLimiter({ windowMs: 10_000, max: 50 }))

const upload = createUploadMiddleware({
  maxSize: 5 * 1024 * 1024, // 5MB max
  allowedTypes: 'image'
})

// Public endpoint used by many clients
router.get('/active', optionalAuth, microCache(120_000), PopupController.getActive)

// Admin endpoints
router.get('/', 
  requireAuth, 
  requirePermission('popups'), 
  PopupController.index
)

router.post('/', 
  requireAuth, 
  requirePermission('popups'), 
  upload.single('image'), 
  validate(popupSchema),
  PopupController.create
)

router.put('/:id', 
  requireAuth, 
  requirePermission('popups'), 
  upload.single('image'), 
  validate(popupSchema),
  PopupController.update
)

router.delete('/:id', 
  requireAuth, 
  requirePermission('popups'), 
  PopupController.destroy
)

export default router
