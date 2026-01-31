
import { Router } from 'express'
import { query } from '../database.js'
import multer from 'multer'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache, purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { sanitizeText } from '../utils/sanitization.js'
import { PRPosterController } from '../controllers/PRPosterController.js'

const router = Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// กำหนดโฟลเดอร์สำหรับเก็บไฟล์: uploads/pr_posters
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pr_posters')

// สร้างโฟลเดอร์ถ้ายังไม่มี
const prepareUploadDir = async () => {
    try {
        if (!existsSync(UPLOAD_DIR)) {
            await fs.mkdir(UPLOAD_DIR, { recursive: true })
        }
    } catch (e) {
        console.error('Failed to create upload directory:', e)
    }
}
prepareUploadDir()

// Optimize image buffer using sharp (convert to WebP)
async function optimizeImage(buffer, mimetype) {
    try {
        if (mimetype === 'image/gif') return buffer

        let pipeline = sharp(buffer)
        const metadata = await pipeline.metadata()

        // Resize if width is very large
        if (metadata.width && metadata.width > 1920) {
            pipeline = pipeline.resize(1920, null, { withoutEnlargement: true })
        }

        // Convert to WebP for better compression
        pipeline = pipeline.webp({ quality: 85 })

        return await pipeline.toBuffer()
    } catch (err) {
        console.warn('optimizeImage failed:', err?.message)
        return buffer
    }
}

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed'))
        }
    }
})

// List pr_posters
router.get('/', optionalAuth, microCache(30_000), PRPosterController.index)

// Get one pr_poster (metadata only)
router.get('/:id', microCache(60_000), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const rows = await query(
            'SELECT id, title, image_path, image_size, mime_type, display_order, is_published, created_at, updated_at FROM pr_posters WHERE id = ?',
            [req.params.id]
        )

        if (!rows[0]) return res.status(404).json({ error: 'Not found' })

        const row = rows[0]
        // Add timestamp to force fresh load
        const imageUrl = `/api/images/pr-posters/${row.id}?t=${new Date(row.updated_at).getTime()}`

        res.json({
            _id: row.id,
            title: row.title,
            imageUrl,
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

// Create pr_poster
router.post('/', requireAuth, requirePermission('infographics'), upload.single('image'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const payload = { ...req.body }

        if (payload.title) payload.title = sanitizeText(payload.title)
        payload.isPublished = payload.isPublished === 'true' || payload.isPublished === true
        const displayOrder = parseInt(payload.displayOrder, 10) || 0

        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' })
        }

        const kind = await fileTypeFromBuffer(req.file.buffer)
        if (!kind || !kind.mime.startsWith('image/')) {
            return res.status(400).json({ error: 'Invalid image file' })
        }

        // Optimize
        let optimizedBuffer = req.file.buffer
        let finalMime = kind.mime
        let ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'

        try {
            if (kind.mime !== 'image/gif') {
                optimizedBuffer = await optimizeImage(req.file.buffer, kind.mime)
                finalMime = 'image/webp'
                ext = '.webp'
            }
        } catch (optErr) {
            console.warn('PRPoster image optimization failed, using original:', optErr?.message)
        }

        // Generate filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const filename = `poster-${uniqueSuffix}${ext}`
        const filePath = path.join(UPLOAD_DIR, filename)

        // Write to disk
        await fs.writeFile(filePath, optimizedBuffer)

        const relativePath = `pr_posters/${filename}`

        const result = await query(
            `INSERT INTO pr_posters (title, image_path, image_data, image_size, mime_type, display_order, is_published, created_by, updated_by)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
            [
                payload.title || req.file.originalname,
                relativePath,
                optimizedBuffer.length,
                finalMime,
                displayOrder,
                payload.isPublished,
                req.user?.username || null,
                req.user?.username || null
            ]
        )

        purgeCachePrefix('/api/pr-posters')
        res.json({ _id: result.insertId, message: 'PR Poster created successfully' })
    } catch (e) {
        console.error('[pr_posters] POST error:', e)
        res.status(500).json({ error: 'Failed to create poster' })
    }
})

// Update pr_poster
router.put('/:id', requireAuth, requirePermission('infographics'), upload.single('image'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const id = parseInt(req.params.id, 10)
        const payload = { ...req.body }

        if (payload.title) payload.title = sanitizeText(payload.title)

        const updates = []
        const values = []

        if (payload.title) {
            updates.push('title = ?')
            values.push(payload.title)
        }

        if (payload.isPublished !== undefined) {
            const isPub = payload.isPublished === 'true' || payload.isPublished === true
            updates.push('is_published = ?')
            values.push(isPub)
        }

        if (payload.displayOrder) {
            updates.push('display_order = ?')
            values.push(parseInt(payload.displayOrder, 10))
        }

        if (req.file) {
            const kind = await fileTypeFromBuffer(req.file.buffer)
            if (!kind || !kind.mime.startsWith('image/')) {
                return res.status(400).json({ error: 'Invalid image file' })
            }

            let optimizedBuffer = req.file.buffer
            let finalMime = kind.mime
            let ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'

            try {
                if (kind.mime !== 'image/gif') {
                    optimizedBuffer = await optimizeImage(req.file.buffer, kind.mime)
                    finalMime = 'image/webp'
                    ext = '.webp'
                }
            } catch (optErr) {
                console.warn('PRPoster image optimization failed:', optErr?.message)
            }

            // DELETE OLD FILE LOGIC
            try {
                const [rows] = await query('SELECT image_path FROM pr_posters WHERE id = ?', [id])
                if (rows[0] && rows[0].image_path) {
                    const dbPath = rows[0].image_path
                    const candidates = [
                        path.join(process.cwd(), 'uploads', dbPath),
                        path.join(process.cwd(), dbPath)
                    ]

                    for (const candidate of candidates) {
                        try {
                            if (existsSync(candidate)) {
                                await fs.unlink(candidate)
                                console.log('[pr_posters] PUT Old file deleted:', candidate)
                                break
                            }
                        } catch (e) { }
                    }
                }
            } catch (err) { console.warn('Ignore old file cleanup error', err) }

            // Save new file
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            const filename = `poster-${uniqueSuffix}${ext}`
            const fullPath = path.join(UPLOAD_DIR, filename)

            await fs.writeFile(fullPath, optimizedBuffer)

            const relativePath = `pr_posters/${filename}`

            updates.push('image_path = ?', 'image_data = NULL', 'image_size = ?', 'mime_type = ?')
            values.push(relativePath, optimizedBuffer.length, finalMime)
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' })
        }

        updates.push('updated_by = ?')
        values.push(req.user?.username || null)
        values.push(id)

        await query(
            `UPDATE pr_posters SET ${updates.join(', ')} WHERE id = ?`,
            values
        )

        purgeCachePrefix('/api/pr-posters')
        res.json({ message: 'PR Poster updated successfully' })
    } catch (e) {
        console.error('[pr_posters] PUT error:', e)
        res.status(500).json({ error: 'Failed to update poster' })
    }
})

// Delete
router.delete('/:id', requireAuth, requirePermission('infographics'), async (req, res) => {
    try {
        const id = req.params.id

        // Get file path before delete
        const rows = await query('SELECT image_path FROM pr_posters WHERE id = ?', [id])

        if (!rows[0]) {
            return res.status(404).json({ error: 'Poster not found' })
        }

        const dbPath = rows[0].image_path

        // Delete from database first
        await query('DELETE FROM pr_posters WHERE id = ?', [id])

        // Then try to delete file
        if (dbPath) {
            const candidates = [
                path.join(process.cwd(), 'uploads', dbPath),
                path.join(process.cwd(), dbPath),
                path.join(process.cwd(), 'server', 'uploads', dbPath)
            ]

            for (const candidate of candidates) {
                try {
                    if (existsSync(candidate)) {
                        await fs.unlink(candidate)
                        break
                    }
                } catch (e) {
                    console.error('[pr_posters] Error deleting file:', e.message)
                }
            }
        }

        purgeCachePrefix('/api/pr-posters')
        res.json({ message: 'PR Poster deleted successfully' })
    } catch (e) {
        console.error('[pr_posters] DELETE error:', e)
        res.status(500).json({ error: 'Failed to delete poster' })
    }
})

export default router
