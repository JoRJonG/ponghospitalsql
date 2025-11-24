import { Router } from 'express'
import { query } from '../database.js'
import multer from 'multer'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { fileTypeFromBuffer } from 'file-type'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeText } from '../utils/sanitization.js'

const router = Router()

// Configure multer for file uploads
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

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// List infographics
router.get('/', optionalAuth, microCache(30_000), async (req, res) => {
  const { published } = req.query
  const publishedOnly = published !== 'false' || !req.user || !userHasPermission(req.user, 'infographics')
  
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  
  try {
    const whereClause = publishedOnly ? 'WHERE is_published = TRUE' : ''
    const rows = await query(
      `SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at 
       FROM infographics 
       ${whereClause}
       ORDER BY display_order ASC, created_at DESC`,
      []
    )
    
    const list = rows.map(row => ({
      _id: row.id,
      title: row.title,
      imageUrl: `/api/images/infographics/${row.id}`,
      imageSize: row.image_size,
      mimeType: row.mime_type,
      displayOrder: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    
    res.json(list)
  } catch (e) {
    console.error('[infographics] GET / error:', e?.message)
    res.status(500).json({ error: 'Failed to fetch infographics', details: e?.message })
  }
})

// Get one infographic (metadata only)
router.get('/:id', microCache(60_000), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  
  try {
    const rows = await query(
      'SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at FROM infographics WHERE id = ?',
      [req.params.id]
    )
    
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    
    const row = rows[0]
    res.json({
      _id: row.id,
      title: row.title,
      imageUrl: `/api/images/infographics/${row.id}`,
      imageSize: row.image_size,
      mimeType: row.mime_type,
      displayOrder: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  } catch (e) {
    res.status(400).json({ error: 'Invalid ID' })
  }
})

// Create infographic
router.post('/', requireAuth, requirePermission('infographics'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  
  try {
    const payload = { ...req.body }
    
    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    
    // Parse isPublished and displayOrder
    if (payload.isPublished !== undefined) {
      payload.isPublished = payload.isPublished === 'true' || payload.isPublished === true
    } else {
      payload.isPublished = true
    }
    
    const displayOrder = parseInt(payload.displayOrder, 10) || 0
    
    // Require image upload
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' })
    }
    
    const kind = await fileTypeFromBuffer(req.file.buffer)
    if (!kind || !kind.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid image file' })
    }
    
    const imageData = req.file.buffer
    const fileName = decodeUploadFilename(req.file.originalname)
    const mimeType = kind.mime || req.file.mimetype
    const fileSize = req.file.size
    
    const result = await query(
      `INSERT INTO infographics (title, image_data, image_size, mime_type, display_order, is_published, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title || fileName,
        imageData,
        fileSize,
        mimeType,
        displayOrder,
        payload.isPublished,
        req.user?.username || null,
        req.user?.username || null
      ]
    )
    
    purgeCachePrefix('/api/infographics')
    res.json({ _id: result.insertId, message: 'Infographic created successfully' })
  } catch (e) {
    console.error('[infographics] POST error:', e)
    res.status(500).json({ error: 'Failed to create infographic', details: e?.message })
  }
})

// Update infographic
router.put('/:id', requireAuth, requirePermission('infographics'), upload.single('image'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  
  try {
    const id = parseInt(req.params.id, 10)
    const payload = { ...req.body }
    
    // Sanitize user inputs
    if (payload.title) payload.title = sanitizeText(payload.title)
    
    // Parse isPublished
    if (payload.isPublished !== undefined) {
      payload.isPublished = payload.isPublished === 'true' || payload.isPublished === true
    }
    
    const displayOrder = parseInt(payload.displayOrder, 10)
    
    // Build update fields
    const updates = []
    const values = []
    
    if (payload.title) {
      updates.push('title = ?')
      values.push(payload.title)
    }
    
    if (payload.isPublished !== undefined) {
      updates.push('is_published = ?')
      values.push(payload.isPublished)
    }
    
    if (!isNaN(displayOrder)) {
      updates.push('display_order = ?')
      values.push(displayOrder)
    }
    
    // Handle image update
    if (req.file) {
      const kind = await fileTypeFromBuffer(req.file.buffer)
      if (!kind || !kind.mime.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid image file' })
      }
      
      updates.push('image_data = ?', 'image_size = ?', 'mime_type = ?')
      values.push(req.file.buffer, req.file.size, kind.mime || req.file.mimetype)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }
    
    updates.push('updated_by = ?')
    values.push(req.user?.username || null)
    values.push(id)
    
    await query(
      `UPDATE infographics SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
    
    purgeCachePrefix('/api/infographics')
    res.json({ message: 'Infographic updated successfully' })
  } catch (e) {
    console.error('[infographics] PUT error:', e)
    res.status(500).json({ error: 'Failed to update infographic', details: e?.message })
  }
})

// Reorder infographics
router.post('/reorder', requireAuth, requirePermission('infographics'), async (req, res) => {
  const { order } = req.body
  
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Order must be an array of IDs' })
  }
  
  try {
    for (let i = 0; i < order.length; i++) {
      await query('UPDATE infographics SET display_order = ? WHERE id = ?', [i, order[i]])
    }
    
    purgeCachePrefix('/api/infographics')
    res.json({ message: 'Reorder successful' })
  } catch (e) {
    console.error('[infographics] POST /reorder error:', e)
    res.status(400).json({ error: 'Failed to reorder infographics', details: e?.message })
  }
})

// Delete infographic
router.delete('/:id', requireAuth, requirePermission('infographics'), async (req, res) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({ error: 'Database unavailable' })
  }
  
  try {
    await query('DELETE FROM infographics WHERE id = ?', [req.params.id])
    
    purgeCachePrefix('/api/infographics')
    res.json({ message: 'Infographic deleted successfully' })
  } catch (e) {
    console.error('[infographics] DELETE error:', e)
    res.status(500).json({ error: 'Failed to delete infographic', details: e?.message })
  }
})

export default router
