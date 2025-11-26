import { Router } from 'express'
import Activity from '../models/mysql/ActivityBlob.js'
import multer from 'multer'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { fileTypeFromBuffer } from 'file-type'
import { decodeUploadFilename } from '../utils/filename.js'
import { viewCache, VIEW_COOLDOWN_MS } from '../utils/viewCache.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'

const router = Router()

// Configure multer for multiple file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max per file (supports high-res images)
    files: 100 // allow up to 100 files for galleries with many photos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Global small limiter for this router
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List activities (optionally only published)
router.get('/', optionalAuth, microCache(5_000), async (req, res) => {
  const { published } = req.query
  const wantAll = published === 'false'
  const isAuthed = Boolean(req.user)
  const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'activities')
  if (!req.app.locals.dbConnected) {
    return res.json([])
  }
  try {
    const now = new Date()
    const query = allowAll
      ? {}
      : {
        isPublished: true,
        $or: [
          { publishedAt: { $lte: now } },
          { publishedAt: { $exists: false } },
          { publishedAt: null },
        ],
      }
    const list = await Activity.find(query, { sort: { publishedAt: -1, updatedAt: -1, createdAt: -1, date: -1 } })
    res.json(list)
  } catch (e) {
    console.error('[activities] GET / error:', e?.message)
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
      return res.status(403).json({ error: 'Permission denied to read activities' })
    }
    res.status(500).json({ error: 'Failed to fetch activities', details: e?.message })
  }
})

// Get one
router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const item = await Activity.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (e) {
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
      return res.status(403).json({ error: 'Permission denied to read activities' })
    }
    res.status(400).json({ error: 'Invalid ID' })
  }
})

// Increment view count
router.post('/:id/view', async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  // Professional: Trust proxy for real IP, fallback to remoteAddress
  const activityId = req.params.id
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
  if (Array.isArray(clientIP)) clientIP = clientIP[0]
  // Normalize IPv6 localhost
  if (clientIP === '::1') clientIP = '127.0.0.1'
  const cacheKey = `${clientIP}:${activityId}`
  const now = Date.now()

  // Check if this IP has viewed this content recently
  const lastViewTime = viewCache.get(cacheKey)
  if (lastViewTime && (now - lastViewTime) < VIEW_COOLDOWN_MS) {
    return res.json({ success: true, counted: false })
  }

  // Optimistically reserve this slot to avoid race conditions from double triggers
  viewCache.set(cacheKey, now)

  try {
    await Activity.incrementViewCount(activityId)
    res.json({ success: true, counted: true })
  } catch (e) {
    console.error('[activities] POST /:id/view error:', e?.message)
    viewCache.delete(cacheKey)
    res.status(500).json({ error: 'Failed to increment view count', details: e?.message })
  }
})

// Create with image uploads
router.post('/', requireAuth, requirePermission('activities'), upload.array('images', 100), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const payload = { ...req.body }
    if (req.user?.username) payload.createdBy = req.user.username

    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    if (payload.description) payload.description = sanitizeHtml(payload.description)

    // แปลง isPublished จาก string เป็น boolean
    if (payload.isPublished !== undefined) {
      payload.isPublished = payload.isPublished === 'true' || payload.isPublished === true
    }

    // จัดการรูปภาพ
    const images = []

    // รูปจากไฟล์อัปโหลด
    if (req.files && req.files.length > 0) {
      // console.log(`[activities] POST: Received ${req.files.length} file(s)`)
      for (const file of req.files) {
        // Validate real image type
        const kind = await fileTypeFromBuffer(file.buffer)
        if (!kind || !kind.mime.startsWith('image/')) {
          continue // skip invalid file
        }
        const decodedName = decodeUploadFilename(file.originalname)
        // console.log(`[activities] POST: File - ${decodedName} (${file.size} bytes, ${file.mimetype})`)
        images.push({
          imageData: file.buffer,
          fileName: decodedName,
          mimeType: kind.mime || file.mimetype,
          fileSize: file.size
        })
      }
    } else {
      // console.log('[activities] POST: No files received')
    }

    // รูปจาก URLs (ถ้ามี)
    if (payload.imageUrls) {
      const urls = Array.isArray(payload.imageUrls) ? payload.imageUrls : [payload.imageUrls]
      for (const url of urls) {
        if (url && url.trim()) {
          try {
            const response = await fetch(url.trim())
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            // Sniff actual type
            const contentType = response.headers.get('content-type') || 'application/octet-stream'

            let fileName = 'image.jpg'
            try {
              const urlObj = new URL(url)
              const pathParts = urlObj.pathname.split('/')
              fileName = pathParts[pathParts.length - 1] || 'image.jpg'
            } catch { }

            const kind = await fileTypeFromBuffer(buffer)
            const finalMime = kind?.mime || contentType
            if (!finalMime.startsWith('image/')) continue
            images.push({ imageData: buffer, fileName, mimeType: finalMime, fileSize: buffer.length })
          } catch (err) {
            console.error('Failed to download image from URL:', err)
          }
        }
      }
    }

    payload.images = images
    const doc = await Activity.create(payload)
    purgeCachePrefix('/api/activities')
    res.status(201).json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to create activity', details: e.message })
  }
})

// Update - รองรับทั้ง JSON และ multipart/form-data
router.put('/:id', requireAuth, requirePermission('activities'), (req, res, next) => {
  // ถ้าเป็น multipart/form-data ให้ใช้ multer, ถ้าเป็น JSON ให้ข้าม
  const contentType = req.get('Content-Type') || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.array('images', 100)(req, res, next)
  }
  next()
}, async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const before = await Activity.findById(req.params.id)
    if (!before) return res.status(404).json({ error: 'Not found' })

    const payload = { ...req.body }
    if (req.user?.username) payload.updatedBy = req.user.username

    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    if (payload.description) payload.description = sanitizeHtml(payload.description)

    // แปลง isPublished จาก string เป็น boolean (สำหรับ FormData)
    if (payload.isPublished !== undefined && typeof payload.isPublished === 'string') {
      payload.isPublished = payload.isPublished === 'true'
    }

    // จัดการรูปภาพ (เฉพาะเมื่อมีการอัปโหลดไฟล์ใหม่หรือ URL ใหม่)
    // ถ้าไม่มี req.files และไม่มี imageUrls = เก็บรูปเดิมไว้ (ไม่แก้ไข payload.images)
    if (req.files && req.files.length > 0) {
      // console.log(`[activities] PUT: Received ${req.files.length} file(s)`)
      const images = []
      for (const file of req.files) {
        const decodedName = decodeUploadFilename(file.originalname)
        images.push({
          imageData: file.buffer,
          fileName: decodedName,
          mimeType: file.mimetype,
          fileSize: file.size
        })
      }
      payload.images = images
    } else if (payload.imageUrls) {
      const urls = Array.isArray(payload.imageUrls) ? payload.imageUrls : [payload.imageUrls]
      const images = []
      for (const url of urls) {
        if (url && url.trim()) {
          try {
            const response = await fetch(url.trim())
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const contentType = response.headers.get('content-type') || 'image/jpeg'

            let fileName = 'image.jpg'
            try {
              const urlObj = new URL(url)
              const pathParts = urlObj.pathname.split('/')
              fileName = pathParts[pathParts.length - 1] || 'image.jpg'
            } catch { }

            images.push({
              imageData: buffer,
              fileName: fileName,
              mimeType: contentType,
              fileSize: buffer.length
            })
          } catch (err) {
            console.error('Failed to download image from URL:', err)
          }
        }
      }
      payload.images = images
    } else if (payload.images && Array.isArray(payload.images)) {
      // Handle mixed content (existing images + new Data URLs)
      for (const img of payload.images) {
        if (img.url && typeof img.url === 'string' && img.url.startsWith('data:')) {
          try {
            const matches = img.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
            if (matches && matches.length === 3) {
              img.mimeType = matches[1]
              img.imageData = Buffer.from(matches[2], 'base64')
              img.fileName = img.name || 'image.webp'
              img.fileSize = img.bytes || img.imageData.length
            }
          } catch (err) {
            console.error('Failed to parse Data URL image:', err)
          }
        }
      }
    }

    const doc = await Activity.findByIdAndUpdate(req.params.id, payload, { new: true })
    purgeCachePrefix('/api/activities')
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to update activity', details: e?.message })
  }
})

// Delete
router.delete('/:id', requireAuth, requirePermission('activities'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const doc = await Activity.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    purgeCachePrefix('/api/activities')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete activity', details: e?.message })
  }
})

export default router
