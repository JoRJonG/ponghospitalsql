import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, announcementSchema } from '../utils/validation.js'
import { handleViewIncrement } from '../utils/ViewCounter.js'

import { AnnouncementController } from '../controllers/AnnouncementController.js'
import { AnnouncementService } from '../services/AnnouncementService.js'

const router = Router()

// Configure multer for attachment uploads
const upload = createUploadMiddleware({
  maxSize: 50 * 1024 * 1024 // 50MB
})

// Optional multipart wrapper to extract files into req.files and body fields into req.body
function optionalMultipart() {
  return (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toString()
    if (!ct.startsWith('multipart/')) return next()
    upload.any()(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large' })
        }
        return res.status(400).json({ error: err.message || 'Upload error' })
      }
      next()
    })
  }
}

function uploadSingleMdw(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const mb = Math.round(MAX_ATTACHMENT_SIZE / (1024 * 1024))
          return res.status(400).json({ error: 'File too large', details: `File must be ${mb}MB or smaller` })
        }
        return next(err)
      }
      next()
    })
  }
}

// Global small limiter for this router
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List announcements
router.get('/', optionalAuth, microCache(5_000, 60), AnnouncementController.index)

// Get one
router.get('/:id', microCache(60_000), AnnouncementController.show)

// Increment view count
router.post('/:id/view', async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  const announcementId = req.params.id
  const result = await handleViewIncrement(req, announcementId, (id) => AnnouncementService.incrementViewCount(id))

  if (!result.success) {
    return res.status(500).json({ error: 'Failed to increment view count', details: result.error })
  }

  res.json({ success: true, counted: result.counted })
})

// Upload a single attachment to an existing announcement
router.post('/:id/attachment', 
  requireAuth, 
  requirePermission('announcements'), 
  uploadSingleMdw('file'), 
  AnnouncementController.uploadAttachment
)

// Create with optional multipart attachments
router.post('/', 
  requireAuth, 
  requirePermission('announcements'), 
  optionalMultipart(),
  // We don't strictly run `validate` here because payload might be buried in `req.body.payload` due to older client logic. 
  // Let the controller handle extracting `req.body.payload` first if present, then we trust Service validation.
  // Wait, better yet, we can map `req.body.payload` to `req.body` in a middleware if present.
  (req, res, next) => {
    if (req.body && req.body.payload && typeof req.body.payload === 'string') {
      try {
        req.body = { ...req.body, ...JSON.parse(req.body.payload) }
      } catch (e) { }
    }
    next()
  },
  validate(announcementSchema),
  AnnouncementController.create
)

// Update
router.put('/:id', 
  requireAuth, 
  requirePermission('announcements'), 
  validate(announcementSchema),
  AnnouncementController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('announcements'), 
  AnnouncementController.destroy
)

export default router
