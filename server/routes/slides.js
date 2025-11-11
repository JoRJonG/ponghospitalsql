import { Router } from 'express'
import Slide from '../models/mysql/SlideBlob.js'
import multer from 'multer'
import sharp from 'sharp'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import { microCache } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { pool } from '../database.js'

const router = Router()

// Optimize image buffer using sharp
async function optimizeImage(buffer, mimetype) {
  try {
    // For GIF files, don't optimize to preserve animation
    if (mimetype === 'image/gif') {
      return buffer
    }
    
    let pipeline = sharp(buffer)
    
    // Get image info
    const metadata = await pipeline.metadata()
    
    // Resize if too large (max 1920px width, maintain aspect ratio)
    if (metadata.width > 1920) {
      pipeline = pipeline.resize(1920, null, { withoutEnlargement: true })
    }
    
    // Convert to WebP for better compression
    if (metadata.width > 100) {
      pipeline = pipeline.webp({ quality: 85 })
    } else {
      // For small images, keep original format but compress
      pipeline = pipeline.jpeg({ quality: 90 })
    }
    
    return await pipeline.toBuffer()
  } catch (error) {
    // If optimization fails, return original buffer
    console.warn('Image optimization failed:', error.message)
    return buffer
  }
}

// Configure multer to store files in memory
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Small burst limiter
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List slides (optionally only published)
router.get('/', optionalAuth, microCache(5_000), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.json([])
  const { published } = req.query
  const wantAll = published === 'false'
  const isAuthed = Boolean(req.user)
  const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'slides')
  try {
    const query = allowAll ? {} : { isPublished: true }
    const list = await Slide.find(query, { sort: { order: 1, createdAt: -1 } })
    res.json(list)
  } catch (e) {
    console.error('Error fetching slides:', e)
    res.status(500).json({ error: 'Failed to fetch slides' })
  }
})

// Get one slide
router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await Slide.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    console.error('Error fetching slide:', e)
    res.status(400).json({ error: 'Invalid ID' })
  }
})

// Create with file upload
router.post('/', requireAuth, requirePermission('slides'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' })

    const body = { ...req.body }
    const link = (body.href || body.link || body.url || '').toString().trim()
    if (link) body.href = link

    if (body.isPublished !== false) {
      const alt = (body.alt || '').toString().trim()
      if (!alt) return res.status(400).json({ error: 'Alt text is required when publishing a slide' })
    }

    // Optimize image
    let optimizedBuffer = req.file.buffer
    try {
      optimizedBuffer = await optimizeImage(req.file.buffer, req.file.mimetype)
    } catch (optError) {
      console.warn('Image optimization failed, using original:', optError.message)
      // Continue with original buffer
    }

    const slideData = {
      title: body.title,
      caption: body.caption || '',
      alt: body.alt || '',
      href: body.href || '',
      imageData: optimizedBuffer,
      fileName: decodeUploadFilename(req.file.originalname),
      mimeType: req.file.mimetype,
      fileSize: optimizedBuffer.length,
      order: body.order || 0,
      isPublished: body.isPublished !== false,
      duration: body.duration || 5
    }

    const doc = await Slide.create(slideData)
    res.status(201).json(doc)
  } catch (e) {
    console.error('Error creating slide:', e)
    res.status(400).json({ error: 'Failed to create slide', details: e?.message })
  }
})

// Update with optional file upload
router.put('/:id', requireAuth, requirePermission('slides'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const before = await Slide.findById(req.params.id)
    if (!before) return res.status(404).json({ error: 'Not found' })

    const body = { ...req.body }
    const link = (body.href || body.link || body.url || '').toString().trim()
    if (link) body.href = link

    const updateData = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.caption !== undefined) updateData.caption = body.caption
    if (body.alt !== undefined) updateData.alt = body.alt
    if (body.href !== undefined) updateData.href = body.href
    if (body.order !== undefined) updateData.order = body.order
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished
    if (body.duration !== undefined) updateData.duration = body.duration

    // If new image file uploaded
    if (req.file) {
      // Optimize image
      let optimizedBuffer = req.file.buffer
      try {
        optimizedBuffer = await optimizeImage(req.file.buffer, req.file.mimetype)
      } catch (optError) {
        console.warn('Image optimization failed, using original:', optError.message)
        // Continue with original buffer
      }

      updateData.imageData = optimizedBuffer
      updateData.fileName = decodeUploadFilename(req.file.originalname)
      updateData.mimeType = req.file.mimetype
      updateData.fileSize = optimizedBuffer.length
    }

    if (updateData.isPublished === true || (updateData.isPublished === undefined && before.isPublished)) {
      const alt = (updateData.alt !== undefined ? updateData.alt : before.alt || '').toString().trim()
      if (!alt) return res.status(400).json({ error: 'Alt text is required when publishing a slide' })
    }

    const doc = await Slide.updateById(req.params.id, updateData)
    res.json(doc)
  } catch (e) {
    console.error('Error updating slide:', e)
    res.status(400).json({ error: 'Failed to update slide', details: e?.message })
  }
})

// Delete
router.delete('/:id', requireAuth, requirePermission('slides'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await Slide.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    await pool.execute('DELETE FROM slides WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('Error deleting slide:', e)
    res.status(400).json({ error: 'Failed to delete slide', details: e?.message })
  }
})

// Bulk reorder slides: expects [{ _id, order }]
router.post('/reorder', requireAuth, requirePermission('slides'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const items = Array.isArray(req.body) ? req.body : []
    const validItems = items.filter(it => it && (typeof it._id === 'string' || typeof it._id === 'number') && Number.isFinite(Number(it.order)))
    
    if (!validItems.length) return res.status(400).json({ error: 'No valid items' })
    
    // Update each slide individually for MySQL
    const updatePromises = validItems.map(item => 
      Slide.updateById(Number(item._id), { order: Number(item.order) })
    )
    
    await Promise.all(updatePromises)
    res.json({ ok: true, modified: validItems.length })
  } catch (e) {
    console.error('Error reordering slides:', e)
    res.status(400).json({ error: 'Failed to reorder slides', details: e?.message })
  }
})

// Get slide count
router.get('/count', optionalAuth, async (req, res) => {
  if (!req.app.locals.dbConnected) return res.json({ count: 0 })
  try {
    const count = await Slide.countDocuments()
    res.json({ count })
  } catch (e) {
    console.error('Error counting slides:', e)
    res.status(500).json({ error: 'Failed to count slides' })
  }
})

export default router
