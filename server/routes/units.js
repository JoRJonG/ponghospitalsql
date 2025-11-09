import { Router } from 'express'
import Unit from '../models/mysql/UnitBlob.js'
import multer from 'multer'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { fileTypeFromBuffer } from 'file-type'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { decodeUploadFilename } from '../utils/filename.js'

const router = Router()

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

// List units (optionally only published)
router.get('/', optionalAuth, microCache(15_000), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.json([])
  const { published } = req.query
  const wantAll = published === 'false'
  const isAuthed = Boolean(req.user)
  const allowAll = wantAll && isAuthed
  try {
    const query = allowAll ? {} : { isPublished: true }
    const list = await Unit.find(query, { sort: { order: 1, createdAt: -1 } })
    res.json(list)
  } catch (e) {
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
  return res.status(403).json({ error: 'Permission denied to read units' })
    }
    res.status(500).json({ error: 'Failed to fetch units' })
  }
})

// Get one unit
router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await Unit.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
  return res.status(403).json({ error: 'Permission denied to read units' })
    }
    res.status(400).json({ error: 'Invalid ID' })
  }
})

// Create with file upload
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const body = { ...req.body }
    const link = (body.href || body.link || body.url || '').toString().trim()
    if (link) body.href = link
    
    const unitData = {
      name: body.name,
      href: body.href || '',
      order: body.order || 0,
      isPublished: body.isPublished !== false
    }
    
    // ถ้ามีไฟล์อัปโหลด
    if (req.file) {
      const kind = await fileTypeFromBuffer(req.file.buffer)
      if (!kind || !kind.mime.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid image file' })
      }
  unitData.imageData = req.file.buffer
  unitData.fileName = decodeUploadFilename(req.file.originalname)
      unitData.mimeType = kind.mime || req.file.mimetype
      unitData.fileSize = req.file.size
    }
    // ถ้าส่ง URL มาให้ดาวน์โหลด
    else if (body.imageUrl) {
      try {
        const imageUrl = body.imageUrl.trim()
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
        
        // ดึงชื่อไฟล์จาก URL
        let fileName = 'image.jpg'
        try {
          const urlObj = new URL(imageUrl)
          const pathParts = urlObj.pathname.split('/')
          fileName = pathParts[pathParts.length - 1] || 'image.jpg'
        } catch {}
        
  const kind = await fileTypeFromBuffer(buffer)
  const finalMime = kind?.mime || contentType
  if (!finalMime.startsWith('image/')) return res.status(400).json({ error: 'Invalid image URL' })
  unitData.imageData = buffer
  unitData.fileName = fileName
  unitData.mimeType = finalMime
  unitData.fileSize = buffer.length
      } catch (err) {
        console.error('Failed to download image from URL:', err)
        return res.status(400).json({ error: 'Failed to download image from URL', details: err.message })
      }
    }
    
  const doc = await Unit.create(unitData)
  purgeCachePrefix('/api/units')
    res.status(201).json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to create unit', details: e?.message })
  }
})

// Update with optional file upload
router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
    const before = await Unit.findById(req.params.id)
    if (!before) return res.status(404).json({ error: 'Not found' })
    
    const body = { ...req.body }
    const link = (body.href || body.link || body.url || '').toString().trim()
    if (link) body.href = link
    
    const updateData = {}
    if (body.name) updateData.name = body.name
    if (body.href !== undefined) updateData.href = body.href
    if (body.order !== undefined) updateData.order = body.order
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished
    
    // ถ้ามีไฟล์อัปโหลด
    if (req.file) {
      const kind = await fileTypeFromBuffer(req.file.buffer)
      if (!kind || !kind.mime.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid image file' })
      }
  updateData.imageData = req.file.buffer
  updateData.fileName = decodeUploadFilename(req.file.originalname)
      updateData.mimeType = kind.mime || req.file.mimetype
      updateData.fileSize = req.file.size
    }
    // ถ้าส่ง URL มาให้ดาวน์โหลด
    else if (body.imageUrl) {
      try {
        const imageUrl = body.imageUrl.trim()
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
        
        // ดึงชื่อไฟล์จาก URL
        let fileName = 'image.jpg'
        try {
          const urlObj = new URL(imageUrl)
          const pathParts = urlObj.pathname.split('/')
          fileName = pathParts[pathParts.length - 1] || 'image.jpg'
        } catch {}
        
  const kind = await fileTypeFromBuffer(buffer)
  const finalMime = kind?.mime || contentType
  if (!finalMime.startsWith('image/')) return res.status(400).json({ error: 'Invalid image URL' })
  updateData.imageData = buffer
  updateData.fileName = fileName
  updateData.mimeType = finalMime
  updateData.fileSize = buffer.length
      } catch (err) {
        console.error('Failed to download image from URL:', err)
        return res.status(400).json({ error: 'Failed to download image from URL', details: err.message })
      }
    }
    
  const doc = await Unit.updateById(req.params.id, updateData)
  purgeCachePrefix('/api/units')
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to update unit', details: e?.message })
  }
})

// Delete
router.delete('/:id', requireAuth, async (req, res) => {
  if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
  try {
  const doc = await Unit.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
  purgeCachePrefix('/api/units')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete unit', details: e?.message })
  }
})

export default router
