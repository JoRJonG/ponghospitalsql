import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { ItaItem, saveItaPdf, getItaPdf, attachPdfToItem, listItemPdfs, deletePdf } from '../models/mysql/ItaItem.js'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { decodeUploadFilename } from '../utils/filename.js'

const router = Router()
router.use(createRateLimiter({ windowMs: 10_000, max: 60 }))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// List as tree
router.get('/tree', optionalAuth, microCache(15_000), async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      return res.json([])
    }
    const includeUnpublished = !!req.user
    const tree = await ItaItem.findTree({ includeUnpublished })
    res.json(tree)
  } catch (e) {
    console.error('[ITA] tree error:', e?.message)
    res.status(500).json({ error: 'Failed to fetch ITA tree', details: e?.message })
  }
})

// Flat list
router.get('/', optionalAuth, microCache(15_000), async (req, res) => {
  try {
    const includeUnpublished = !!req.user
    const all = await ItaItem.findAll({ includeUnpublished })
    res.json(all)
  } catch (e) {
    console.error('[ITA] list error:', e?.message)
    res.status(500).json({ error: 'Failed to fetch ITA items', details: e?.message })
  }
})

// Single item detail (with its PDFs + direct children)
router.get('/item/:id', optionalAuth, microCache(10_000), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'Bad id' })
    const includeUnpublished = !!req.user
    const item = await ItaItem.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (!includeUnpublished && item.isPublished === false) return res.status(404).json({ error: 'Not found' })
    const all = await ItaItem.findAll({ includeUnpublished })
    const children = all.filter(r => r.parentId === id && (includeUnpublished || r.isPublished))
    const pdfs = await listItemPdfs(id)
    res.json({ item, children, pdfs })
  } catch (e) {
    console.error('[ITA] item detail error:', e?.message)
    res.status(500).json({ error: 'Failed to fetch item', details: e?.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, parentId, slug, content, isPublished, pdfUrl, pdfFileId } = req.body || {}
    if (!title) return res.status(400).json({ error: 'Missing title' })
    const item = await ItaItem.create({ title, parentId: parentId || null, slug, content, pdfUrl: pdfFileId ? `/api/ita/pdf/${pdfFileId}` : pdfUrl, isPublished })
    purgeCachePrefix('/api/ita')
    res.status(201).json(item)
  } catch (e) {
    res.status(400).json({ error: 'Create failed', details: e?.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    if (body.pdfFileId) {
      body.pdfUrl = `/api/ita/pdf/${body.pdfFileId}`
    }
    const item = await ItaItem.updateById(id, body)
    if (!item) return res.status(404).json({ error: 'Not found' })
    purgeCachePrefix('/api/ita')
    res.json(item)
  } catch (e) {
    res.status(400).json({ error: 'Update failed', details: e?.message })
  }
})

// Upload PDF (returns file id)
router.post('/upload/pdf', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    let kind = null
    try { kind = await fileTypeFromBuffer(req.file.buffer) } catch (e) { console.warn('[ITA upload] fileTypeFromBuffer failed:', e?.message) }
    const sniff = kind?.mime
    const declared = req.file.mimetype
  const decodedName = decodeUploadFilename(req.file.originalname)
  const looksPdf = declared === 'application/pdf' || sniff === 'application/pdf' || decodedName.toLowerCase().endsWith('.pdf')
    if (!looksPdf) {
      return res.status(400).json({ error: 'Only PDF allowed', details: `declared=${declared} sniff=${sniff}` })
    }
  const filename = decodedName
  const saved = await saveItaPdf({ filename, mimetype: 'application/pdf', buffer: req.file.buffer })
    if (!saved?.id) return res.status(500).json({ error: 'Insert failed' })
    res.json({ id: saved.id, url: `/api/ita/pdf/${saved.id}` })
  } catch (e) {
    console.error('[ITA upload] error:', e?.message)
    res.status(400).json({ error: 'Upload failed', details: e?.message })
  }
})

// Upload & attach PDF to specific item (multipart)  /api/ita/:id/pdf
router.post('/:id/pdf', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    if (!itemId) return res.status(400).json({ error: 'Invalid item id' })
    if (!req.file) return res.status(400).json({ error: 'No file' })
    let kind = null
    try { kind = await fileTypeFromBuffer(req.file.buffer) } catch {}
    const sniff = kind?.mime
    const declared = req.file.mimetype
  const decodedName = decodeUploadFilename(req.file.originalname)
  const looksPdf = declared === 'application/pdf' || sniff === 'application/pdf' || decodedName.toLowerCase().endsWith('.pdf')
    if (!looksPdf) return res.status(400).json({ error: 'Only PDF allowed' })
  const filename = decodedName
    const saved = await attachPdfToItem(itemId, { filename, mimetype: 'application/pdf', buffer: req.file.buffer })
    res.json({ id: saved.id, url: `/api/ita/pdf/${saved.id}` })
  } catch (e) {
    console.error('[ITA upload item pdf] error:', e?.message)
    res.status(400).json({ error: 'Upload failed', details: e?.message })
  }
})

// List PDFs of an item
router.get('/:id/pdfs', optionalAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.id)
    const list = await listItemPdfs(itemId)
    res.json(list)
  } catch (e) {
    res.status(400).json({ error: 'List failed', details: e?.message })
  }
})

// Delete single PDF
router.delete('/pdf/file/:fileId', requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.fileId)
    await deletePdf(fileId)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Delete failed', details: e?.message })
  }
})

// Serve PDF
router.get('/pdf/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const file = await getItaPdf(id)
    if (!file) return res.status(404).json({ error: 'Not found' })
    if (!file.bytes) return res.status(500).json({ error: 'Corrupt PDF (no data)' })
    res.setHeader('Content-Type', file.mimetype || 'application/pdf')
    // Correctly encode UTF-8 filenames (Thai, etc.) per RFC 5987 so browsers display readable name instead of percent-encoded
    const encodeRFC5987 = (str) => encodeURIComponent(str)
      .replace(/['()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
      .replace(/\*/g, '%2A')
      .replace(/%(7C|60|5E)/g, '%25$1') // ensure reserved not misinterpreted
    const fallback = file.filename.replace(/[^\x20-\x7E]/g, '_') // ASCII fallback
    const cd = `inline; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987(file.filename)}`
    res.setHeader('Content-Disposition', cd)
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.send(file.bytes)
  } catch (e) {
    console.error('[ITA] pdf serve error:', e?.message)
    res.status(400).json({ error: 'Read failed', details: e?.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await ItaItem.deleteById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    purgeCachePrefix('/api/ita')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Delete failed', details: e?.message })
  }
})

router.post('/reorder', requireAuth, async (req, res) => {
  try {
    const { items } = req.body || {}
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' })
    await ItaItem.reorder(items)
    purgeCachePrefix('/api/ita')
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Reorder failed', details: e?.message })
  }
})

export default router