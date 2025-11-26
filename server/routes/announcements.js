import { Router } from 'express'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import multer from 'multer'
import iconv from 'iconv-lite'
import { fileTypeFromBuffer } from 'file-type'
import { query } from '../database.js'
import Announcement from '../models/mysql/Announcement.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { viewCache, VIEW_COOLDOWN_MS } from '../utils/viewCache.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'

const router = Router()

// Normalize uploaded filenames: try UTF-8, fall back to Windows-874 (common on Thai Windows clients)
function normalizeFilename(name) {
  if (!name) return name
  try {
    // Get raw bytes as binary (latin1) to preserve original octets
    const raw = Buffer.from(String(name), 'binary')
    let decoded = raw.toString('utf8')
    // If decoded contains replacement characters or many question marks, try windows-874
    const looksBad = decoded.includes('\uFFFD') || /\?{2,}/.test(decoded) || !(/[\u0E00-\u0E7F]/.test(decoded) || /[A-Za-z0-9]/.test(decoded))
    if (looksBad) {
      const alt = iconv.decode(raw, 'windows-874')
      // If alt contains Thai characters, prefer it
      if (/[\u0E00-\u0E7F]/.test(alt)) decoded = alt
    }
    return decoded
  } catch (e) {
    console.warn('[normalizeFilename] decode failed:', e?.message)
    return name
  }
}

// Apply a small burst limiter to protect DB when users refresh rapidly
router.use(createRateLimiter({ windowMs: 10_000, max: 40 })) // 40 req/10s per IP

// List announcements, optional category filter
router.get('/', optionalAuth, microCache(5_000), async (req, res) => {
  const { category, published } = req.query
  const wantAll = published === 'false'
  const isAuthed = Boolean(req.user)
  const allowAll = wantAll && isAuthed && userHasPermission(req.user, 'announcements')
  if (!req.app.locals.dbConnected) {
    // Allow site to render even if DB is not configured yet
    return res.json([])
  }
  try {
    const now = new Date()
    const query = {
      ...(category ? { category } : {}),
      ...(allowAll ? {} : { isPublished: true, publishedAt: { $lte: now } }),
    }
    const list = await Announcement.find(query, { sort: { publishedAt: -1, createdAt: -1 } })
    res.json(list)
  } catch (e) {
    console.error('[announcements] GET / error:', e?.message)
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
      return res.status(403).json({ error: 'Permission denied to read announcements' })
    }
    res.status(500).json({ error: 'Failed to fetch announcements', details: e?.message })
  }
})

router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const item = await Announcement.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (e) {
    const msg = String(e?.message || '')
    if (/not allowed to do action \[find\]/i.test(msg)) {
      return res.status(403).json({ error: 'Permission denied to read announcements' })
    }
    res.status(400).json({ error: 'Invalid ID' })
  }
})

router.post('/:id/view', async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  // Professional: Trust proxy for real IP, fallback to remoteAddress
  const announcementId = req.params.id
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
  if (Array.isArray(clientIP)) clientIP = clientIP[0]
  // Normalize IPv6 localhost
  if (clientIP === '::1') clientIP = '127.0.0.1'
  const cacheKey = `${clientIP}:${announcementId}`
  const now = Date.now()

  // Check if this IP has viewed this content recently
  const lastViewTime = viewCache.get(cacheKey)
  if (lastViewTime && (now - lastViewTime) < VIEW_COOLDOWN_MS) {
    return res.json({ success: true, counted: false })
  }

  // Optimistically reserve this slot to avoid race conditions from double triggers
  viewCache.set(cacheKey, now)

  try {
    await Announcement.incrementViewCount(announcementId)
    res.json({ success: true, counted: true })
  } catch (e) {
    console.error('[announcements] POST /:id/view error:', e?.message)
    viewCache.delete(cacheKey)
    res.status(500).json({ error: 'Failed to increment view count', details: e?.message })
  }
})

router.post('/', requireAuth, requirePermission('announcements'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const payload = { ...req.body }
    if (req.user?.username) payload.createdBy = req.user.username

    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    if (payload.category) payload.category = sanitizeText(payload.category)

    // จำกัด attachments ไม่เกิน 5 รายการ และแต่ละไฟล์ไม่เกิน 10MB (base64)
    if (payload.attachments && Array.isArray(payload.attachments)) {
      if (payload.attachments.length > 5) {
        return res.status(400).json({ error: 'Too many attachments (max 5)' })
      }

      // เช็คขนาดแต่ละไฟล์
      for (const att of payload.attachments) {
        if (att.url && att.url.startsWith('data:')) {
          const base64Length = att.url.split(',')[1]?.length || 0
          const sizeInBytes = (base64Length * 3) / 4 // ประมาณการขนาดจริง
          if (sizeInBytes > 50 * 1024 * 1024) { // 50MB
            return res.status(400).json({
              error: 'Attachment too large',
              details: `File "${att.name}" exceeds 50MB limit. Please compress the file.`
            })
          }
        }
      }
    }

    // Validate required fields to avoid passing undefined bind params to SQL
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!payload.category || typeof payload.category !== 'string' || payload.category.trim() === '') {
      return res.status(400).json({ error: 'Category is required' })
    }

    const doc = await Announcement.create(payload)
    // purge caches on write
    purgeCachePrefix('/api/announcements')
    res.status(201).json(doc)
  } catch (e) {
    console.error('[announcements] POST error:', e.message)
    res.status(400).json({ error: 'Failed to create announcement', details: e.message })
  }
})

// Support multipart uploads for attachments (attach to existing announcement)
const MAX_ATTACHMENT_SIZE = 300 * 1024 * 1024 // 300MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_SIZE } })
function uploadMdw(fieldName) {
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

// POST /api/announcements/:id/attachment - attach file (PDF or image) to announcement
router.post('/:id/attachment', requireAuth, requirePermission('announcements'), uploadMdw('file'), async (req, res) => {
  try {
    const announcementId = Number(req.params.id)
    if (!announcementId) return res.status(400).json({ error: 'Invalid announcement id' })
    if (!req.file) return res.status(400).json({ error: 'No file' })

    let kind = null
    try { kind = await fileTypeFromBuffer(req.file.buffer) } catch (e) { console.warn('[announcements upload] fileTypeFromBuffer failed:', e?.message) }
    const sniff = kind?.mime
    const declared = req.file.mimetype

    const isPdf = declared === 'application/pdf' || sniff === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')
    const isImg = declared.startsWith('image/') && sniff && sniff.startsWith('image/')
    if (!isPdf && !isImg) return res.status(400).json({ error: 'Only PDF or image files are allowed' })

    let fileName = normalizeFilename(req.file.originalname)
    const mimeType = isPdf ? 'application/pdf' : (kind?.mime || req.file.mimetype)
    const fileSize = req.file.size
    const fileBuffer = req.file.buffer

    // determine next display_order
    // const rows = await query('SELECT COALESCE(MAX(display_order), -1) as max_order FROM announcement_attachments WHERE announcement_id = ?', [announcementId])
    // const nextOrder = (rows && rows[0] && typeof rows[0].max_order === 'number') ? rows[0].max_order + 1 : 0

    // const result = await query(
    //   `INSERT INTO announcement_attachments (announcement_id, file_data, mime_type, file_size, kind, file_name, display_order)
    //    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    //   [announcementId, fileBuffer, mimeType, fileSize, isPdf ? 'pdf' : 'image', fileName, nextOrder]
    // )

    // const attachmentId = result.insertId
    // const url = `/api/images/announcements/${announcementId}/${attachmentId}`
    // res.json({ id: attachmentId, url, name: fileName, bytes: fileSize, kind: isPdf ? 'pdf' : 'image' })

    const result = await Announcement.addAttachment(announcementId, {
      buffer: fileBuffer,
      filename: fileName,
      mimetype: mimeType,
      kind: isPdf ? 'pdf' : 'image'
    })

    res.json(result)
  } catch (e) {
    console.error('[announcements upload] error:', e?.message)
    res.status(400).json({ error: 'Upload failed', details: e?.message })
  }
})

// Allow creating announcement with multipart/form-data (files + fields)
// If request Content-Type is multipart/* we will parse files and inject attachments
function optionalMultipart() {
  return (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toString()
    if (!ct.startsWith('multipart/')) return next()
    // reuse upload instance
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

// Modify POST / to accept multipart: fields as normal form fields; files will be converted to data URLs
router.post('/', requireAuth, requirePermission('announcements'), optionalMultipart(), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  try {
    // Build payload from either JSON body (when not multipart) or form fields
    let payload = {}
    if (req.is('multipart/*')) {
      // Multer stores non-file fields in req.body as strings
      try {
        // If client sent a `payload` JSON string, parse it
        if (req.body && req.body.payload) {
          payload = JSON.parse(req.body.payload)
        } else {
          payload = { ...req.body }
        }
      } catch (e) {
        console.warn('Failed to parse multipart payload JSON:', e?.message)
        payload = { ...req.body }
      }

      // Convert uploaded files into attachments (data URLs) and append to payload.attachments
      const files = req.files || []
      payload.attachments = payload.attachments && Array.isArray(payload.attachments) ? payload.attachments.slice() : []
      for (const f of files) {
        const dataUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
        const safeName = normalizeFilename(f.originalname)
        payload.attachments.push({ url: dataUrl, name: safeName, bytes: f.size, kind: f.mimetype === 'application/pdf' ? 'pdf' : 'image' })
      }
    } else {
      payload = { ...req.body }
    }

    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    if (payload.category) payload.category = sanitizeText(payload.category)

    // Attachment count/size checks are already in model create, but keep guard here
    if (payload.attachments && Array.isArray(payload.attachments)) {
      if (payload.attachments.length > 10) {
        return res.status(400).json({ error: 'Too many attachments (max 10)' })
      }
    }

    if (req.user?.username) payload.createdBy = req.user.username

    const doc = await Announcement.create(payload)
    purgeCachePrefix('/api/announcements')
    res.status(201).json(doc)
  } catch (e) {
    console.error('[announcements] POST multipart error:', e?.message)
    res.status(400).json({ error: 'Failed to create announcement', details: e?.message })
  }
})

router.put('/:id', requireAuth, requirePermission('announcements'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const before = await Announcement.findById(req.params.id)
    const payload = { ...req.body }
    if (req.user?.username) payload.updatedBy = req.user.username

    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    if (payload.category) payload.category = sanitizeText(payload.category)

    const doc = await Announcement.findByIdAndUpdate(req.params.id, payload, { new: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    purgeCachePrefix('/api/announcements')
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: 'Failed to update announcement' })
  }
})

router.delete('/:id', requireAuth, requirePermission('announcements'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const doc = await Announcement.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    purgeCachePrefix('/api/announcements')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete announcement' })
  }
})

export default router
