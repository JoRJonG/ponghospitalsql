
import { Router } from 'express'
import { query } from '../database.js'
import multer from 'multer'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { toOrganizationChartDTO } from '../dto/OrganizationChartDTO.js'

const router = Router()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'organization')

// Ensure upload directory exists
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
        if (metadata.width && metadata.width > 2000) {
            pipeline = pipeline.resize(2000, null, { withoutEnlargement: true })
        }

        // Convert to WebP for better compression
        pipeline = pipeline.webp({ quality: 85 })

        return await pipeline.toBuffer()
    } catch (err) {
        console.warn('optimizeImage failed:', err?.message)
        return buffer
    }
}

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

// List organization charts
router.get('/', optionalAuth, async (req, res) => {
    try {
        const isPublic = !req.user || !req.query.published

        let sql = 'SELECT * FROM organization_charts'
        const params = []

        if (req.query.published === 'false') {
            if (!req.user) {
                sql += ' WHERE is_published = TRUE'
            }
        } else {
            sql += ' WHERE is_published = TRUE'
        }

        sql += ' ORDER BY display_order ASC, created_at DESC'

        const rows = await query(sql, params)
        const data = rows.map(toOrganizationChartDTO)

        res.json(data)
    } catch (error) {
        console.error('[organization] get error:', error)
        res.status(500).json({ error: 'Failed to fetch organization charts' })
    }
})

// Create
router.post('/', requireAuth, requirePermission('organization'), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' })
        }

        const { title, isPublished, displayOrder } = req.body

        const kind = await fileTypeFromBuffer(req.file.buffer)
        if (!kind || !kind.mime.startsWith('image/')) {
            return res.status(400).json({ error: 'Invalid image file' })
        }

        let optimizedBuffer = req.file.buffer
        let ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'

        try {
            if (kind.mime !== 'image/gif') {
                optimizedBuffer = await optimizeImage(req.file.buffer, kind.mime)
                ext = '.webp'
            }
        } catch (optErr) {
            console.warn('Image optimization failed, using original:', optErr?.message)
        }

        const filename = `${Date.now()}-${randomUUID()}${ext}`
        const filePath = path.join(UPLOAD_DIR, filename)

        await fs.writeFile(filePath, optimizedBuffer)

        await query(
            `INSERT INTO organization_charts (title, image_path, display_order, is_published, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                title || req.file.originalname,
                filename,
                displayOrder || 0,
                isPublished === 'true',
                req.user?.username,
                req.user?.username
            ]
        )

        res.json({ success: true, message: 'Created successfully' })
    } catch (error) {
        console.error('[organization] create error:', error)
        res.status(500).json({ error: 'Failed to create' })
    }
})

// Update
router.put('/:id', requireAuth, requirePermission('organization'), upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id
        const { title, isPublished } = req.body

        const rows = await query('SELECT image_path FROM organization_charts WHERE id = ?', [id])
        if (!rows[0]) return res.status(404).json({ error: 'Not found' })

        const updates = []
        const values = []

        if (title !== undefined) {
            updates.push('title = ?')
            values.push(title)
        }

        if (isPublished !== undefined) {
            updates.push('is_published = ?')
            values.push(isPublished === 'true')
        }

        if (req.file) {
            const kind = await fileTypeFromBuffer(req.file.buffer)
            if (!kind || !kind.mime.startsWith('image/')) {
                return res.status(400).json({ error: 'Invalid image file' })
            }

            let optimizedBuffer = req.file.buffer
            let ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'

            try {
                if (kind.mime !== 'image/gif') {
                    optimizedBuffer = await optimizeImage(req.file.buffer, kind.mime)
                    ext = '.webp'
                }
            } catch (optErr) {
                console.warn('Image optimization failed:', optErr?.message)
            }

            const filename = `${Date.now()}-${randomUUID()}${ext}`
            const filePath = path.join(UPLOAD_DIR, filename)

            await fs.writeFile(filePath, optimizedBuffer)

            updates.push('image_path = ?')
            values.push(filename)

            // Delete old file
            if (rows[0].image_path) {
                const oldPath = path.join(UPLOAD_DIR, rows[0].image_path)
                try {
                    if (await fs.stat(oldPath).catch(() => false)) {
                        await fs.unlink(oldPath)
                    }
                } catch (e) { }
            }
        }

        if (updates.length > 0) {
            updates.push('updated_by = ?')
            values.push(req.user?.username)

            values.push(id)

            await query(
                `UPDATE organization_charts SET ${updates.join(', ')} WHERE id = ?`,
                values
            )
        }

        res.json({ success: true, message: 'Updated successfully' })
    } catch (error) {
        console.error('[organization] update error:', error)
        res.status(500).json({ error: 'Failed to update' })
    }
})

// Delete
router.delete('/:id', requireAuth, requirePermission('organization'), async (req, res) => {
    try {
        const id = req.params.id

        const rows = await query('SELECT image_path FROM organization_charts WHERE id = ?', [id])
        if (!rows[0]) return res.status(404).json({ error: 'Not found' })

        await query('DELETE FROM organization_charts WHERE id = ?', [id])

        if (rows[0].image_path) {
            const filePath = path.join(UPLOAD_DIR, rows[0].image_path)
            try {
                if (await fs.stat(filePath).catch(() => false)) {
                    await fs.unlink(filePath)
                }
            } catch (e) { }
        }

        res.json({ success: true, message: 'Deleted successfully' })
    } catch (error) {
        console.error('[organization] delete error:', error)
        res.status(500).json({ error: 'Failed to delete' })
    }
})

// Reorder
router.post('/reorder', requireAuth, requirePermission('organization'), async (req, res) => {
    const { order } = req.body
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid order data' })

    try {
        for (let i = 0; i < order.length; i++) {
            await query('UPDATE organization_charts SET display_order = ? WHERE id = ?', [i, order[i]])
        }
        res.json({ success: true })
    } catch (error) {
        console.error('[organization] reorder error:', error)
        res.status(500).json({ error: 'Reorder failed' })
    }
})

export default router
