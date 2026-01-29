import { Router } from 'express'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import Document from '../models/mysql/Document.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/DocumentDTO.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'

import { decodeUploadFilename, contentDisposition } from '../utils/filename.js'

const router = Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// กำหนดโฟลเดอร์สำหรับเก็บไฟล์: d:\ponghospitalsql\uploads\documents
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents')

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

// Multer configuration สำหรับอัปโหลดไฟล์
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE }
})

// ประเภทไฟล์ที่อนุญาต
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
]

/**
 * GET /api/documents
 * ดึงรายการเอกสารทั้งหมด
 */
router.get('/', optionalAuth, async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const { category, search, page = 1, limit = 20, isPublished } = req.query
        const isAdmin = userHasPermission(req.user, 'documents')

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)

        let isPublishedFilter
        if (isAdmin) {
            // Admin: Check if specific filter requested (e.g. from public view)
            if (isPublished !== undefined) {
                isPublishedFilter = isPublished === 'true'
            } else {
                isPublishedFilter = undefined // Show all (default for admin dashboard)
            }
        } else {
            // Non-admin: Always strictly published only
            isPublishedFilter = true
        }

        const filters = {
            category,
            search,
            page: pageNum,
            limit: limitNum,
            isPublished: isPublishedFilter
        }

        const [docs, total] = await Promise.all([
            Document.findAll(filters),
            Document.count(filters)
        ])

        const result = isAdmin ? toAdminDTOList(docs) : toPublicDTOList(docs)

        res.json({
            data: result,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        })
    } catch (e) {
        console.error('[documents] GET error:', e.message)
        res.status(500).json({ error: 'Failed to fetch documents' })
    }
})

/**
 * GET /api/documents/categories
 * ดึงรายการหมวดหมู่ทั้งหมด
 */
router.get('/categories', async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const categories = await Document.getCategories()
        res.json(categories)
    } catch (e) {
        console.error('[documents] GET categories error:', e.message)
        res.status(500).json({ error: 'Failed to fetch categories' })
    }
})

/**
 * GET /api/documents/:id
 * ดึงข้อมูลเอกสาร (ไม่รวมไฟล์)
 */
router.get('/:id', optionalAuth, async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const doc = await Document.findById(req.params.id)

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' })
        }

        // ตรวจสอบสิทธิ์ถ้าเอกสารไม่ได้เผยแพร่
        if (!doc.is_published) {
            const isAdmin = userHasPermission(req.user, 'documents')
            if (!isAdmin) {
                return res.status(404).json({ error: 'Document not found' })
            }
        }

        const isAdmin = userHasPermission(req.user, 'documents')
        const result = isAdmin ? toAdminDTO(doc) : toPublicDTO(doc)

        res.json(result)
    } catch (e) {
        console.error('[documents] GET :id error:', e.message)
        res.status(500).json({ error: 'Failed to fetch document' })
    }
})

/**
 * GET /api/documents/:id/download
 * ดาวน์โหลดไฟล์เอกสาร
 */
router.get('/:id/download', async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const doc = await Document.findById(req.params.id)

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' })
        }

        // ตรวจสอบว่าเอกสารเผยแพร่หรือไม่
        if (!doc.is_published) {
            return res.status(404).json({ error: 'Document not found' })
        }

        // ดึง file path
        const fileInfo = await Document.getFilePath(doc.id)

        if (!fileInfo || !fileInfo.file_path) {
            return res.status(404).json({ error: 'File not found' })
        }

        const filePath = path.join(process.cwd(), fileInfo.file_path)

        // ตรวจสอบว่าไฟล์มีอยู่จริง
        if (!existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' })
        }

        // เพิ่มจำนวนดาวน์โหลด
        await Document.incrementDownloadCount(doc.id)

        // ส่งไฟล์
        res.setHeader('Content-Type', fileInfo.mime_type)

        // ใช้ contentDisposition helper เพื่อรองรับชื่อไฟล์ภาษาไทยที่ดีกว่า (RFC 5987)
        res.setHeader('Content-Disposition', contentDisposition('attachment', fileInfo.file_name))

        res.sendFile(filePath)
    } catch (e) {
        console.error('[documents] GET :id/download error:', e.message)
        res.status(500).json({ error: 'Failed to download document' })
    }
})

/**
 * POST /api/documents
 * สร้างเอกสารใหม่พร้อมอัปโหลดไฟล์
 */
router.post('/', requireAuth, requirePermission('documents'), upload.single('file'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        // ตรวจสอบประเภทไฟล์
        let fileType = null
        try {
            fileType = await fileTypeFromBuffer(req.file.buffer)
        } catch (e) {
            console.warn('[documents] fileTypeFromBuffer failed:', e?.message)
        }

        const detectedMime = fileType?.mime
        const declaredMime = req.file.mimetype

        // ตรวจสอบว่าเป็นไฟล์ที่อนุญาตหรือไม่
        const isAllowed = ALLOWED_MIME_TYPES.includes(declaredMime) || ALLOWED_MIME_TYPES.includes(detectedMime)

        if (!isAllowed) {
            return res.status(400).json({
                error: 'Invalid file type',
                details: 'Only PDF, DOC, DOCX, XLS, XLSX files are allowed'
            })
        }

        // ดึงข้อมูลจาก request body
        const { title, description, category, isPublished, displayOrder } = req.body

        // Sanitize inputs
        const sanitizedTitle = title ? sanitizeText(title) : ''
        const sanitizedDescription = description ? sanitizeHtml(description) : ''
        const sanitizedCategory = category ? sanitizeText(category) : ''

        if (!sanitizedTitle || !sanitizedCategory) {
            return res.status(400).json({ error: 'Title and category are required' })
        }

        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        // Normalize filename to fix Mojibake (Thai characters)
        const decodedName = decodeUploadFilename(req.file.originalname)
        const ext = path.extname(decodedName)
        const safeFileName = `${timestamp}-${randomStr}${ext}`
        const filePath = path.join(UPLOAD_DIR, safeFileName)

        // บันทึกไฟล์ลงโฟลเดอร์ uploads/documents
        await fs.writeFile(filePath, req.file.buffer)

        // เก็บ relative path ในฐานข้อมูล: uploads/documents/filename
        const relativePath = path.join('uploads', 'documents', safeFileName).replace(/\\/g, '/')

        // สร้างเอกสาร
        const doc = await Document.create({
            title: sanitizedTitle,
            description: sanitizedDescription,
            category: sanitizedCategory,
            filePath: relativePath,
            fileName: decodedName,
            mimeType: declaredMime,
            fileSize: req.file.size,
            isPublished: isPublished === 'true' || isPublished === true,
            displayOrder: displayOrder ? parseInt(displayOrder) : 0,
            createdBy: req.user?.username
        })

        // Purge cache
        purgeCachePrefix('/api/documents')

        // ดึงข้อมูลเอกสารที่สร้างเสร็จแล้ว
        const createdDoc = await Document.findById(doc.id)
        res.status(201).json(toAdminDTO(createdDoc))
    } catch (e) {
        console.error('[documents] POST error:', e.message)

        if (e.message.includes('ขนาดไฟล์เกินกำหนด')) {
            return res.status(400).json({ error: e.message })
        }

        res.status(500).json({ error: 'Failed to create document', details: e.message })
    }
})

/**
 * PUT /api/documents/:id
 * อัปเดตข้อมูลเอกสาร (และไฟล์ถ้ามี)
 */
router.put('/:id', requireAuth, requirePermission('documents'), upload.single('file'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const { title, description, category, isPublished, displayOrder } = req.body

        const payload = {}

        if (title !== undefined) {
            payload.title = sanitizeText(title)
        }

        if (description !== undefined) {
            payload.description = sanitizeHtml(description)
        }

        if (category !== undefined) {
            payload.category = sanitizeText(category)
        }

        if (isPublished !== undefined) {
            payload.isPublished = isPublished === 'true' || isPublished === true
        }

        if (displayOrder !== undefined) {
            payload.displayOrder = parseInt(displayOrder)
        }

        // ถ้ามีไฟล์ใหม่
        if (req.file) {
            // ตรวจสอบประเภทไฟล์
            let fileType = null
            try {
                fileType = await fileTypeFromBuffer(req.file.buffer)
            } catch (e) {
                console.warn('[documents] fileTypeFromBuffer failed:', e?.message)
            }

            const detectedMime = fileType?.mime
            const declaredMime = req.file.mimetype
            const isAllowed = ALLOWED_MIME_TYPES.includes(declaredMime) || ALLOWED_MIME_TYPES.includes(detectedMime)

            if (!isAllowed) {
                return res.status(400).json({
                    error: 'Invalid file type',
                    details: 'Only PDF, DOC, DOCX, XLS, XLSX files are allowed'
                })
            }

            // ลบไฟล์เก่า
            const oldDoc = await Document.getFilePath(req.params.id)
            if (oldDoc && oldDoc.file_path) {
                const oldFilePath = path.join(process.cwd(), oldDoc.file_path)
                try {
                    if (existsSync(oldFilePath)) {
                        await fs.unlink(oldFilePath)
                    }
                } catch (e) {
                    console.warn('[documents] Failed to delete old file:', e.message)
                }
            }

            // บันทึกไฟล์ใหม่
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(7)
            // Normalize filename to fix Mojibake (Thai characters)
            const decodedName = decodeUploadFilename(req.file.originalname)
            const ext = path.extname(decodedName)
            const safeFileName = `${timestamp}-${randomStr}${ext}`
            const filePath = path.join(UPLOAD_DIR, safeFileName)

            await fs.writeFile(filePath, req.file.buffer)

            const relativePath = path.join('uploads', 'documents', safeFileName).replace(/\\/g, '/')

            payload.filePath = relativePath
            payload.fileName = decodedName
            payload.mimeType = declaredMime
            payload.fileSize = req.file.size
        }

        payload.updatedBy = req.user?.username

        await Document.findByIdAndUpdate(req.params.id, payload)

        // Purge cache
        purgeCachePrefix('/api/documents')

        // ดึงข้อมูลเอกสารที่อัปเดตแล้ว
        const updatedDoc = await Document.findById(req.params.id)
        res.json(toAdminDTO(updatedDoc))
    } catch (e) {
        console.error('[documents] PUT error:', e.message)

        if (e.message === 'Document not found') {
            return res.status(404).json({ error: 'Document not found' })
        }

        res.status(500).json({ error: 'Failed to update document' })
    }
})

/**
 * DELETE /api/documents/:id
 * ลบเอกสาร
 */
router.delete('/:id', requireAuth, requirePermission('documents'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const result = await Document.findByIdAndDelete(req.params.id)

        // ลบไฟล์จริง
        if (result.filePath) {
            const filePath = path.join(process.cwd(), result.filePath)
            try {
                if (existsSync(filePath)) {
                    await fs.unlink(filePath)
                }
            } catch (e) {
                console.warn('[documents] Failed to delete file:', e.message)
            }
        }

        // Purge cache
        purgeCachePrefix('/api/documents')

        res.json({ ok: true })
    } catch (e) {
        console.error('[documents] DELETE error:', e.message)

        if (e.message === 'Document not found') {
            return res.status(404).json({ error: 'Document not found' })
        }

        res.status(500).json({ error: 'Failed to delete document' })
    }
})

export default router
