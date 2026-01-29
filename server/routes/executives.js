import { Router } from 'express'
import Executive from '../models/mysql/Executive.js'
import multer from 'multer'
import sharp from 'sharp'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { fileTypeFromBuffer } from 'file-type'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { ExecutiveController } from '../controllers/ExecutiveController.js'

const router = Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List executives
router.get('/', optionalAuth, microCache(30_000), ExecutiveController.index)

// Get one executive
router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    const item = await Executive.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (e) {
    res.status(400).json({ error: 'Invalid ID' })
  }
})

// Create executive
router.post('/', requireAuth, requirePermission('executives'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    const payload = { ...req.body }

    // Sanitize user inputs
    if (payload.name) payload.name = sanitizeText(payload.name)
    if (payload.position) payload.position = sanitizeText(payload.position)
    if (payload.phone) payload.phone = sanitizeText(payload.phone)
    if (payload.bio) payload.bio = sanitizeHtml(payload.bio)

    // Parse isPublished
    if (payload.isPublished !== undefined) {
      payload.isPublished = payload.isPublished === 'true' || payload.isPublished === true
    }

    // Optimize image buffer using sharp
    async function optimizeImage(buffer, mimetype) {
      try {
        if (mimetype === 'image/gif') return buffer

        let pipeline = sharp(buffer)
        const metadata = await pipeline.metadata()

        // Resize to max 800px width (standard for profile card)
        if (metadata.width && metadata.width > 800) {
          pipeline = pipeline.resize(800, null, { withoutEnlargement: true })
        }

        // Convert to WebP for better compression
        pipeline = pipeline.webp({ quality: 85 })

        return await pipeline.toBuffer()
      } catch (error) {
        console.warn('Image optimization failed:', error.message)
        return buffer
      }
    }

    // ... existing code ...

    // Handle image upload
    if (req.file) {
      const kind = await fileTypeFromBuffer(req.file.buffer)
      if (!kind || !kind.mime.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid image file' })
      }

      let optimizedBuffer = req.file.buffer
      let finalMime = kind.mime || req.file.mimetype

      try {
        optimizedBuffer = await optimizeImage(req.file.buffer, finalMime)
        finalMime = 'image/webp' // We converted to webp
      } catch (optErr) {
        console.warn('Executive image optimization failed:', optErr)
      }

      payload.imageData = optimizedBuffer
      payload.fileName = decodeUploadFilename(req.file.originalname)
      payload.mimeType = finalMime
      payload.fileSize = optimizedBuffer.length
    } else if (payload.imageUrl) {
      // Download from URL
      try {
        const response = await fetch(payload.imageUrl.trim())
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = response.headers.get('content-type') || 'application/octet-stream'

        let fileName = 'executive.jpg'
        try {
          const urlObj = new URL(payload.imageUrl)
          const pathParts = urlObj.pathname.split('/')
          fileName = pathParts[pathParts.length - 1] || 'executive.jpg'
        } catch { }

        const kind = await fileTypeFromBuffer(buffer)
        const finalMime = kind?.mime || contentType
        if (!finalMime.startsWith('image/')) return res.status(400).json({ error: 'Invalid image URL' })
        payload.imageData = buffer
        payload.fileName = fileName
        payload.mimeType = finalMime
        payload.fileSize = buffer.length
      } catch (err) {
        console.error('Failed to download image from URL:', err)
        return res.status(400).json({ error: 'Failed to download image from URL' })
      }
    }

    const doc = await Executive.create(payload)
    purgeCachePrefix('/api/executives')
    res.status(201).json(doc)
  } catch (e) {
    console.error('[executives] POST error:', e)
    res.status(400).json({ error: 'Failed to create executive', details: e.message })
  }
})

// Update executive
router.put('/:id', requireAuth, requirePermission('executives'), (req, res, next) => {
  // Support both JSON and multipart/form-data
  const contentType = req.get('Content-Type') || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next)
  }
  next()
}, async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    const payload = { ...req.body }
    console.log('[executives] PUT payload raw:', payload)

    // Sanitize user inputs
    if (payload.name) payload.name = sanitizeText(payload.name)
    if (payload.position) payload.position = sanitizeText(payload.position)
    if (payload.phone) payload.phone = sanitizeText(payload.phone)
    if (payload.bio) payload.bio = sanitizeHtml(payload.bio)

    // Parse isPublished
    if (payload.isPublished !== undefined) {
      console.log('[executives] Processing isPublished:', payload.isPublished, typeof payload.isPublished)
      if (typeof payload.isPublished === 'string') {
        payload.isPublished = payload.isPublished === 'true'
      }
    }
    console.log('[executives] PUT payload processed:', payload)

    // Handle new image upload
    if (req.file) {
      let optimizedBuffer = req.file.buffer
      let finalMime = req.file.mimetype

      try {
        optimizedBuffer = await optimizeImage(req.file.buffer, finalMime)
        finalMime = 'image/webp'
      } catch (optErr) {
        console.warn('Executive image optimization on update failed:', optErr)
      }

      payload.imageData = optimizedBuffer
      payload.fileName = decodeUploadFilename(req.file.originalname)
      payload.mimeType = finalMime
      payload.fileSize = optimizedBuffer.length
    } else if (payload.imageUrl && !payload.imageUrl.startsWith('/api/')) {
      // Download from URL (but not if it's our own API URL)
      try {
        const response = await fetch(payload.imageUrl.trim())
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = response.headers.get('content-type') || 'image/jpeg'

        let fileName = 'executive.jpg'
        try {
          const urlObj = new URL(payload.imageUrl)
          const pathParts = urlObj.pathname.split('/')
          fileName = pathParts[pathParts.length - 1] || 'executive.jpg'
        } catch { }

        payload.imageData = buffer
        payload.fileName = fileName
        payload.mimeType = contentType
        payload.fileSize = buffer.length
      } catch (err) {
        console.error('Failed to download image from URL:', err)
      }
    }

    const doc = await Executive.updateById(req.params.id, payload)
    if (!doc) return res.status(404).json({ error: 'Not found' })

    purgeCachePrefix('/api/executives')
    res.json(doc)
  } catch (e) {
    console.error('[executives] PUT error:', e)
    res.status(400).json({ error: 'Failed to update executive', details: e?.message })
  }
})

// Update display orders
router.post('/reorder', requireAuth, requirePermission('executives'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    const { orderMap } = req.body // { "1": 0, "2": 1, "3": 2, ... }
    if (!orderMap || typeof orderMap !== 'object') {
      return res.status(400).json({ error: 'Invalid orderMap' })
    }

    await Executive.updateDisplayOrders(orderMap)
    purgeCachePrefix('/api/executives')
    res.json({ success: true })
  } catch (e) {
    console.error('[executives] POST /reorder error:', e)
    res.status(400).json({ error: 'Failed to reorder executives', details: e?.message })
  }
})

// Delete executive
router.delete('/:id', requireAuth, requirePermission('executives'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    const doc = await Executive.deleteById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })

    purgeCachePrefix('/api/executives')
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete executive', details: e?.message })
  }
})

export default router
