import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, activitySchema } from '../utils/validation.js'
import { handleViewIncrement } from '../utils/ViewCounter.js'

import { ActivityController } from '../controllers/ActivityController.js'
import { ActivityService } from '../services/ActivityService.js'

const router = Router()

// Configure multer for multiple file uploads
const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB max per file is enough for images
  allowedTypes: 'image'
})

// Global small limiter for this router
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List activities
router.get('/', optionalAuth, microCache(5_000, 60), ActivityController.index)

// Get one
router.get('/:id', microCache(60_000), ActivityController.show)

// Increment view count
router.post('/:id/view', async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  const activityId = req.params.id
  const result = await handleViewIncrement(req, activityId, (id) => ActivityService.incrementViewCount(id))

  if (!result.success) {
    return res.status(500).json({ error: 'Failed to increment view count', details: result.error })
  }

  res.json({ success: true, counted: result.counted })
})

// Create with image uploads
router.post('/', 
  requireAuth, 
  requirePermission('activities'), 
  upload.array('images', 100), 
  validate(activitySchema), 
  ActivityController.create
)

// Update - supports both JSON and multipart/form-data
router.put('/:id', 
  requireAuth, 
  requirePermission('activities'), 
  (req, res, next) => {
    const contentType = req.get('Content-Type') || ''
    if (contentType.includes('multipart/form-data')) {
      return upload.array('images', 100)(req, res, next)
    }
    next()
  },
  validate(activitySchema),
  ActivityController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('activities'), 
  ActivityController.destroy
)

export default router
