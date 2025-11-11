import { Router } from 'express'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import Announcement from '../models/mysql/Announcement.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { viewCache, VIEW_COOLDOWN_MS } from '../utils/viewCache.js'

const router = Router()

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
          if (sizeInBytes > 10 * 1024 * 1024) { // 10MB
            return res.status(400).json({ 
              error: 'Attachment too large',
              details: `File "${att.name}" exceeds 10MB limit. Please compress the image.`
            })
          }
        }
      }
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

router.put('/:id', requireAuth, requirePermission('announcements'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  try {
    const before = await Announcement.findById(req.params.id)
    const payload = { ...req.body }
    if (req.user?.username) payload.updatedBy = req.user.username
    const doc = await Announcement.findByIdAndUpdate(req.params.id, payload, { new: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    // cleanup removed attachments on Cloudinary
    try {
      const cloud = (await import('../cloudinary.js')).cloudinary
      if (before && Array.isArray(before.attachments) && Array.isArray(doc.attachments) && cloud.config().cloud_name) {
        const beforeIds = new Set(before.attachments.map(it => it?.publicId).filter(Boolean))
        const afterIds = new Set(doc.attachments.map(it => it?.publicId).filter(Boolean))
        for (const id of beforeIds) {
          if (!afterIds.has(id)) {
            await cloud.uploader.destroy(id, { resource_type: 'auto' })
          }
        }
      }
    } catch {}
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
    try {
      const cloud = (await import('../cloudinary.js')).cloudinary
      if (doc.attachments && Array.isArray(doc.attachments) && cloud.config().cloud_name) {
        for (const it of doc.attachments) {
          if (it && it.publicId) {
            await cloud.uploader.destroy(it.publicId, { resource_type: 'auto' })
          }
        }
      }
    } catch {}
    purgeCachePrefix('/api/announcements')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Failed to delete announcement' })
  }
})

export default router
