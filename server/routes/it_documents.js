import express from 'express'
import { createUploadMiddleware, cleanTempFile } from '../middleware/upload.js'
import path from 'path'
import fs from 'fs/promises'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { sanitizeText } from '../utils/sanitization.js'
import { decodeUploadFilename, contentDisposition } from '../utils/filename.js'
import ITDocument from '../models/mysql/ITDocument.js'
import { toAdminDTO, toPublicDTO, toAdminDTOList, toPublicDTOList } from '../dto/ITDocumentDTO.js'

const router = express.Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'it_center')
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES = ['application/pdf']

// Initialize directory and table
const initSystem = async () => {
    try {
        await fs.access(UPLOAD_DIR)
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true })
        console.log('Created IT center upload directory:', UPLOAD_DIR)
    }
    try {
        await ITDocument.initTable()
        console.log('Initialized it_center_docs table')
    } catch (error) {
        console.error('Failed to initialize it_center_docs table:', error)
    }
}
initSystem()

const upload = createUploadMiddleware({
    maxSize: MAX_FILE_SIZE
})

// GET / (Public/Admin)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const search = req.query.search ? sanitizeText(req.query.search) : ''
        const category = req.query.category || ''

        const isAdmin = userHasPermission(req.user, 'it_docs') || userHasPermission(req.user, 'admin')
        const isPublished = isAdmin && req.query.published === 'all' ? undefined : true

        const [items, total] = await Promise.all([
            ITDocument.findAll({ category, isPublished, page, limit, search, excludeContent: true }),
            ITDocument.count({ category, isPublished, search })
        ])

        const totalPages = Math.ceil(total / limit)
        const result = isAdmin ? toAdminDTOList(items) : toPublicDTOList(items)

        res.json({
            data: result,
            pagination: {
                total,
                page,
                totalPages,
                limit
            }
        })
    } catch (error) {
        console.error('Error fetching IT documents:', error)
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' })
    }
})

// GET /view/:id - View document inline (New Tab)
router.get(['/view/:id', '/view/:id/:filename'], async (req, res) => {
    try {
        const fileData = await ITDocument.getFilePath(req.params.id)
        if (!fileData) return res.status(404).json({ error: 'ไม่พบไฟล์' })

        const absolutePath = path.resolve(fileData.file_path)
        try {
            await fs.access(absolutePath)
        } catch {
            return res.status(404).json({ error: 'ไม่พบไฟล์ในระบบ หรืออาจยังไม่ได้แนบไฟล์' })
        }

        await ITDocument.incrementDownload(req.params.id)

        res.setHeader('Content-Type', fileData.mime_type || 'application/pdf')
        res.setHeader('Content-Disposition', contentDisposition('inline', fileData.file_name))
        return res.sendFile(absolutePath)
    } catch (error) {
        console.error('View IT document error:', error)
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปิดไฟล์' })
    }
})

// POST / (Admin)
router.post('/', requireAuth, requirePermission('it_docs'), upload.single('file'), async (req, res) => {
    try {
        const title = sanitizeText(req.body.title || '')
        const description = sanitizeText(req.body.description || '')
        const category = req.body.category || ''
        const isPublished = req.body.isPublished !== 'false'
        const displayOrder = parseInt(req.body.displayOrder) || 0
        const username = req.user.username || 'admin'

        if (!title || !category) return res.status(400).json({ error: 'กรุณาระบุชื่อและหมวดหมู่' })

        let filePath = null
        let fileName = null
        let mimeType = null
        let fileSize = null

        if (req.file) {
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(7)
            const decodedName = decodeUploadFilename(req.file.originalname)
            const safeFileName = `${timestamp}-${randomStr}${path.extname(decodedName)}`
            const fullPath = path.join(UPLOAD_DIR, safeFileName)

            await fs.copyFile(req.file.path, fullPath)

            filePath = path.join('uploads', 'it_center', safeFileName).replace(/\\/g, '/')
            fileName = decodedName
            mimeType = req.file.mimetype
            fileSize = req.file.size
        }

        const newDoc = await ITDocument.create({
            title, description, category,
            filePath,
            fileName,
            mimeType,
            fileSize,
            isPublished, displayOrder,
            createdBy: username
        })

        const createdDoc = await ITDocument.findById(newDoc.id)
        res.status(201).json({ message: 'อัปโหลดสำเร็จ', doc: toAdminDTO(createdDoc) })
    } catch (error) {
        console.error('IT Document upload error:', error)
        res.status(500).json({ error: error.message || 'อัปโหลดไม่สำเร็จ' })
    } finally {
        if (req.file) await cleanTempFile(req.file)
    }
})

// PUT /:id (Admin)
router.put('/:id', requireAuth, requirePermission('it_docs'), upload.single('file'), async (req, res) => {
    try {
        const id = req.params.id
        const existing = await ITDocument.findById(id)
        if (!existing) return res.status(404).json({ error: 'ไม่พบข้อมูล' })

        const updates = {
            title: req.body.title ? sanitizeText(req.body.title) : undefined,
            description: req.body.description !== undefined ? sanitizeText(req.body.description) : undefined,
            category: req.body.category !== undefined ? req.body.category : undefined,
            isPublished: req.body.isPublished !== undefined ? req.body.isPublished === 'true' : undefined,
            displayOrder: req.body.displayOrder !== undefined ? parseInt(req.body.displayOrder) || 0 : undefined,
            updatedBy: req.user.username || 'admin'
        }

        if (req.file) {
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(7)
            const decodedName = decodeUploadFilename(req.file.originalname)
            const safeFileName = `${timestamp}-${randomStr}${path.extname(decodedName)}`
            const filePath = path.join(UPLOAD_DIR, safeFileName)

            await fs.copyFile(req.file.path, filePath)
            updates.filePath = path.join('uploads', 'it_center', safeFileName).replace(/\\/g, '/')
            updates.fileName = decodedName
            updates.mimeType = req.file.mimetype
            updates.fileSize = req.file.size

            // Delete old file
            try {
                const old = await ITDocument.getFilePath(id)
                if (old?.file_path) await fs.unlink(path.resolve(old.file_path))
            } catch (err) { console.warn('Old file delete fail:', err) }
        }

        const updated = await ITDocument.findByIdAndUpdate(id, updates)
        res.json({ message: 'อัปเดตสำเร็จ', doc: toAdminDTO(updated) })
    } catch (error) {
        console.error('IT Document update error:', error)
        res.status(500).json({ error: 'อัปเดตไม่สำเร็จ' })
    } finally {
        if (req.file) await cleanTempFile(req.file)
    }
})

// DELETE /:id (Admin)
router.delete('/:id', requireAuth, requirePermission('it_docs'), async (req, res) => {
    try {
        const id = req.params.id
        const existing = await ITDocument.findById(id)
        if (!existing) return res.status(404).json({ error: 'ไม่พบข้อมูล' })

        const fileData = await ITDocument.findByIdAndDelete(id)
        if (fileData?.file_path) {
            try { await fs.unlink(path.resolve(fileData.file_path)) } catch (e) { }
        }
        res.json({ message: 'ลบข้อมูลสำเร็จ' })
    } catch (error) {
        res.status(500).json({ error: 'ลบไม่สำเร็จ' })
    }
})

// POST /reorder (Admin)
router.post('/reorder', requireAuth, requirePermission('it_docs'), async (req, res) => {
    try {
        const { items } = req.body
        if (!Array.isArray(items)) return res.status(400).json({ error: 'รูปแบบไม่ถูกต้อง' })
        await ITDocument.reorder(items)
        res.json({ message: 'จัดเรียงสำเร็จ' })
    } catch (error) {
        res.status(500).json({ error: 'จัดเรียงไม่สำเร็จ' })
    }
})

export default router
