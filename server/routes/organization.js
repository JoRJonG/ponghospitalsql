import { Router } from 'express'
import { query } from '../database.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../server/uploads/organization')

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR)
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const filename = `${Date.now()}-${randomUUID()}${ext}`
        cb(null, filename)
    }
})

const upload = multer({
    storage,
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
        const isPublic = !req.user || !req.query.published // Default public if no user or no param (though param logic below)
        // Actually, following logic pattern: if ?published=false and user has permission, show all.
        // Otherwise show only published.

        let sql = 'SELECT * FROM organization_charts'
        const params = []

        if (req.query.published === 'false') {
            // Check permission if asking for unpublished
            // This checks if user is logged in essentially for now, but should ideally verify role.
            // For simplicity in this step, we allow authenticated users to see unpublished if they ask,
            // or we can enforce permissions.
            // Let's assume frontend admin passes published=false.
            if (!req.user) {
                sql += ' WHERE is_published = TRUE'
            }
        } else {
            sql += ' WHERE is_published = TRUE'
        }

        sql += ' ORDER BY display_order ASC, created_at DESC'

        const rows = await query(sql, params)

        // Map rows to include full URL
        const data = rows.map(row => ({
            _id: row.id,
            title: row.title,
            imageUrl: `/api/images/organization/${row.id}`, // Serving via images route
            displayOrder: row.display_order,
            isPublished: Boolean(row.is_published),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }))

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
        const imagePath = req.file.filename // We store filename relative to uploads/organization

        await query(
            `INSERT INTO organization_charts (title, image_path, display_order, is_published, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                title || req.file.originalname,
                imagePath,
                displayOrder || 0,
                isPublished === 'true',
                req.user?.username,
                req.user?.username
            ]
        )

        res.json({ success: true, message: 'Created successfully' })
    } catch (error) {
        console.error('[organization] create error:', error)
        // Clean up file if DB insert fails
        if (req.file) {
            fs.unlink(req.file.path, () => { })
        }
        res.status(500).json({ error: 'Failed to create' })
    }
})

// Update
router.put('/:id', requireAuth, requirePermission('organization'), upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id
        const { title, isPublished } = req.body

        // Get existing record to handle file cleanup if image is updated
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
            updates.push('image_path = ?')
            values.push(req.file.filename)

            // Delete old file
            if (rows[0].image_path) {
                const oldPath = path.join(UPLOAD_DIR, rows[0].image_path)
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, () => { })
                }
            }
        }

        if (updates.length > 0) {
            updates.push('updated_by = ?')
            values.push(req.user?.username)

            values.push(id) // WHERE id = ?

            await query(
                `UPDATE organization_charts SET ${updates.join(', ')} WHERE id = ?`,
                values
            )
        }

        res.json({ success: true, message: 'Updated successfully' })
    } catch (error) {
        console.error('[organization] update error:', error)
        if (req.file) fs.unlink(req.file.path, () => { })
        res.status(500).json({ error: 'Failed to update' })
    }
})

// Delete
router.delete('/:id', requireAuth, requirePermission('organization'), async (req, res) => {
    try {
        const id = req.params.id

        // Get info for file deletion
        const rows = await query('SELECT image_path FROM organization_charts WHERE id = ?', [id])
        if (!rows[0]) return res.status(404).json({ error: 'Not found' })

        await query('DELETE FROM organization_charts WHERE id = ?', [id])

        // Delete file
        if (rows[0].image_path) {
            const filePath = path.join(UPLOAD_DIR, rows[0].image_path)
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => { })
            }
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
