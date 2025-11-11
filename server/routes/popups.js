import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { requireAuth, requirePermission, optionalAuth } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import Popup from '../models/mysql/Popup.js'
import { decodeUploadFilename } from '../utils/filename.js'

const router = Router()

// Light burst limiter to protect DB
router.use(createRateLimiter({ windowMs: 10_000, max: 50 }))

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ'))
    }
  }
})

async function optimiseImage(buffer, mimetype) {
  try {
    if (mimetype === 'image/gif') {
      return { buffer, mimeType: mimetype }
    }

    let pipeline = sharp(buffer)
    const metadata = await pipeline.metadata()

    if (metadata.width && metadata.width > 1600) {
      pipeline = pipeline.resize(1600, null, { withoutEnlargement: true })
    }

    if (metadata.width && metadata.width > 120) {
      pipeline = pipeline.webp({ quality: 85 })
      const optimised = await pipeline.toBuffer()
      return { buffer: optimised, mimeType: 'image/webp' }
    }

    if (metadata.hasAlpha) {
      const optimised = await pipeline.png({ compressionLevel: 9 }).toBuffer()
      return { buffer: optimised, mimeType: 'image/png' }
    }

    const optimised = await pipeline.jpeg({ quality: 90 }).toBuffer()
    return { buffer: optimised, mimeType: 'image/jpeg' }
  } catch (error) {
    console.warn('[popups] optimise image failed:', error?.message)
    return { buffer, mimeType: mimetype }
  }
}

const truthyPattern = /^(1|true|yes|on)$/i

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return truthyPattern.test(String(value).trim())
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return num
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString()
  }
  const str = String(value).trim()
  if (!str) return null
  const date = new Date(str)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function pickPayload(body = {}) {
  return {
    title: body.title,
    body: body.body,
    startAt: body.startAt ?? body.start_at ?? null,
    endAt: body.endAt ?? body.end_at ?? null,
    dismissForDays: body.dismissForDays ?? body.dismiss_for_days,
    isActive: body.isActive ?? body.is_active,
    ctaLabel: body.ctaLabel ?? body.cta_label ?? null,
    ctaUrl: body.ctaUrl ?? body.cta_url ?? null,
    imageUrl: body.imageUrl ?? body.image_url,
    removeImage: body.removeImage ?? body.remove_image ?? null
  }
}

async function buildPayload(req) {
  const body = pickPayload(req.body || {})
  const payload = {
    title: body.title ? String(body.title) : '',
    body: body.body ? String(body.body) : '',
    startAt: parseDate(body.startAt),
    endAt: parseDate(body.endAt),
    dismissForDays: Math.max(0, Math.floor(parseNumber(body.dismissForDays, 1))),
    isActive: parseBoolean(body.isActive, true),
    ctaLabel: body.ctaLabel ? String(body.ctaLabel).trim() : null,
    ctaUrl: body.ctaUrl ? String(body.ctaUrl).trim() : null,
    imageUrl: body.imageUrl !== undefined ? (String(body.imageUrl).trim() || null) : undefined,
    clearImage: parseBoolean(body.removeImage || false)
  }

  if (!payload.title.trim()) {
    throw new Error('กรุณาระบุหัวข้อป๊อปอัป')
  }
  if (!payload.body.trim()) {
    throw new Error('กรุณาระบุรายละเอียด')
  }

  if (req.file) {
    const detected = await fileTypeFromBuffer(req.file.buffer)
    if (!req.file.mimetype.startsWith('image/')) {
      throw new Error('ไฟล์รูปภาพไม่ถูกต้อง')
    }

    if (detected && !detected.mime.startsWith('image/')) {
      throw new Error('ไฟล์รูปภาพไม่ถูกต้อง')
    }

    const sourceMime = detected?.mime || req.file.mimetype
    const { buffer, mimeType } = await optimiseImage(req.file.buffer, sourceMime)
    payload.imageData = buffer
    payload.imageMime = mimeType
    payload.imageName = decodeUploadFilename(req.file.originalname)
    payload.imageSize = buffer.length
    payload.imageUrl = null // stored blob takes precedence
    payload.clearImage = false
  }

  if (payload.clearImage && req.file) {
    payload.clearImage = false
  }

  return payload
}

router.get('/active', optionalAuth, microCache(15_000), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.json({ success: true, data: [] })
  }
  try {
    const popups = await Popup.findActive()
    res.json({ success: true, data: popups })
  } catch (error) {
    console.error('[popups] GET /active error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถโหลดป๊อปอัปได้' })
  }
})

router.get('/', requireAuth, requirePermission('popups'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.json({ success: true, data: [] })
  }
  try {
    const popups = await Popup.findAll()
    res.json({ success: true, data: popups })
  } catch (error) {
    console.error('[popups] GET / error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถโหลดข้อมูลป๊อปอัปได้' })
  }
})

router.post('/', requireAuth, requirePermission('popups'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
  }
  try {
    const payload = await buildPayload(req)
    const created = await Popup.create(payload)
    purgeCachePrefix('/api/popups')
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error('[popups] POST error:', error?.message)
    res.status(400).json({ success: false, error: error?.message || 'ไม่สามารถสร้างป๊อปอัปได้' })
  }
})

router.put('/:id', requireAuth, requirePermission('popups'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
  }
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'รหัสไม่ถูกต้อง' })
  }
  try {
    const payload = await buildPayload(req)
    const updated = await Popup.updateById(id, payload)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'ไม่พบป๊อปอัป' })
    }
    purgeCachePrefix('/api/popups')
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('[popups] PUT error:', error?.message)
    res.status(400).json({ success: false, error: error?.message || 'ไม่สามารถปรับปรุงป๊อปอัปได้' })
  }
})

router.delete('/:id', requireAuth, requirePermission('popups'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ success: false, error: 'ฐานข้อมูลไม่พร้อมใช้งาน' })
  }
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'รหัสไม่ถูกต้อง' })
  }
  try {
    const removed = await Popup.deleteById(id)
    if (!removed) {
      return res.status(404).json({ success: false, error: 'ไม่พบป๊อปอัป' })
    }
    purgeCachePrefix('/api/popups')
    res.json({ success: true })
  } catch (error) {
    console.error('[popups] DELETE error:', error?.message)
    res.status(400).json({ success: false, error: 'ไม่สามารถลบป๊อปอัปได้' })
  }
})

export default router
