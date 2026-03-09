import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { sanitizeText } from '../utils/sanitization.js'
import { decodeUploadFilename } from '../utils/filename.js'
import LegalEthics from '../models/mysql/LegalEthics.js'

const router = express.Router()

// Rate limiting สำหรับ endpoint นี้ (ป้องกัน abuse)
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'legal_ethics')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_MIME_TYPES = ['application/pdf']

// ตรวจสอบและสร้างโฟลเดอร์สำหรับเก็บไฟล์
const initSystem = async () => {
    try {
        await fs.access(UPLOAD_DIR)
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true })
        console.log('Created legal ethics upload directory:', UPLOAD_DIR)
    }
    // สร้างตารางใน MySQL ถ้ายังไม่มี
    try {
        await LegalEthics.initTable()
        console.log('Initialized legal_ethics_docs table')
    } catch (error) {
        console.error('Failed to initialize legal_ethics_docs table:', error)
    }
}
initSystem()

// ตั้งค่า multer สำหรับอัปโหลด
// ใช้ configuration ให้คล้ายกับ pr_plans.js มากที่สุด
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE }
})

// ดึงรายการทั้งหมด (Public)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const search = req.query.search ? sanitizeText(req.query.search) : ''
        const category = req.query.category || ''

        // ถ้าเป็นการร้องขอจาก Admin ให้ส่งทั้งหมดกลับไป
        const isAdmin = req.user?.role === 'ADMIN'
        const isPublished = isAdmin && req.query.published === 'all' ? undefined : true

        const [items, total] = await Promise.all([
            LegalEthics.findAll({ category, isPublished, page, limit, search, excludeContent: true }),
            LegalEthics.count({ category, isPublished, search })
        ])

        const totalPages = Math.ceil(total / limit)

        res.json({
            data: items,
            pagination: {
                total,
                page,
                totalPages,
                limit
            }
        })
    } catch (error) {
        console.error('Error fetching legal ethics docs:', error)
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' })
    }
})

// ดาวน์โหลดไฟล์ (Public)
router.get('/download/:id', async (req, res) => {
    try {
        const fileData = await LegalEthics.getFilePath(req.params.id)
        if (!fileData) {
            return res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการ' })
        }

        const absolutePath = path.resolve(fileData.file_path)

        try {
            await fs.access(absolutePath)
        } catch {
            return res.status(404).json({ error: 'ไม่พบไฟล์ในระบบ' })
        }

        // เพิ่มยอดดาวน์โหลด
        await LegalEthics.incrementDownload(req.params.id)

        res.setHeader('Content-Type', fileData.mime_type || 'application/pdf')
        // บังคับให้ดาวน์โหลดแทนที่จะเปิดในเบราว์เซอร์
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.file_name)}"`)
        return res.sendFile(absolutePath)
    } catch (error) {
        console.error('Download error:', error)
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' })
    }
})

// แสดงไฟล์ (Public) - สำหรับพรีวิว
router.get('/file/:id', async (req, res) => {
    try {
        const fileData = await LegalEthics.getFilePath(req.params.id)
        if (!fileData) {
            return res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการ' })
        }

        const absolutePath = path.resolve(fileData.file_path)

        try {
            await fs.access(absolutePath)
        } catch {
            return res.status(404).json({ error: 'ไม่พบไฟล์ในระบบ' })
        }

        res.setHeader('Content-Type', fileData.mime_type || 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.file_name)}"`)
        return res.sendFile(absolutePath)
    } catch (error) {
        console.error('View file error:', error)
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปิดไฟล์' })
    }
})

// ดึงรายละเอียด (Public)
router.get('/:id', async (req, res) => {
    try {
        const item = await LegalEthics.findById(req.params.id)
        if (!item) {
            return res.status(404).json({ error: 'ไม่พบข้อมูล' })
        }
        res.json(item)
    } catch (error) {
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' })
    }
})

// เพิ่มเอกสาร (Admin only)
router.post('/', requireAuth, requirePermission('legal_ethics'), upload.single('file'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ PDF' })
        }

        const title = sanitizeText(req.body.title || '')
        const description = sanitizeText(req.body.description || '')
        const category = req.body.category || ''
        const isPublished = req.body.isPublished !== 'false'
        const displayOrder = parseInt(req.body.displayOrder) || 0
        const username = req.user.username || 'admin'

        if (!title) {
            return res.status(400).json({ error: 'กรุณาระบุชื่อเอกสาร' })
        }
        if (!category) {
            return res.status(400).json({ error: 'กรุณาระบุหมวดหมู่ย่อย' })
        }

        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const decodedName = decodeUploadFilename(req.file.originalname)
        const ext = path.extname(decodedName)
        const safeFileName = `${timestamp}-${randomStr}${ext}`
        const filePath = path.join(UPLOAD_DIR, safeFileName)

        // บันทึกไฟล์ลงโฟลเดอร์ร
        await fs.writeFile(filePath, req.file.buffer)

        // เก็บ relative path ในฐานข้อมูล
        const relativePath = path.join('uploads', 'legal_ethics', safeFileName).replace(/\\/g, '/')

        const newDoc = await LegalEthics.create({
            title,
            description,
            category,
            filePath: relativePath,
            fileName: decodedName,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            isPublished,
            displayOrder,
            createdBy: username
        })

        res.status(201).json({
            message: 'อัปโหลดสำเร็จ',
            id: newDoc.id
        })
    } catch (error) {
        console.error('Upload error:', error)
        res.status(500).json({ error: error.message || 'ไม่สามารถอัปโหลดไฟล์ได้' })
    }
})

// อัปเดตข้อมูล (Admin only)
router.put('/:id', requireAuth, requirePermission('legal_ethics'), upload.single('file'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const id = req.params.id
        const existingDoc = await LegalEthics.findById(id)

        if (!existingDoc) {
            return res.status(404).json({ error: 'ไม่พบข้อมูล' })
        }

        const updates = {
            title: req.body.title ? sanitizeText(req.body.title) : undefined,
            description: req.body.description !== undefined ? sanitizeText(req.body.description) : undefined,
            category: req.body.category !== undefined ? req.body.category : undefined,
            isPublished: req.body.isPublished !== undefined ? req.body.isPublished === 'true' : undefined,
            updatedBy: req.user.username || 'admin'
        }

        // ถ้ามีการอัปโหลดไฟล์ใหม่
        if (req.file) {
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(7)
            const decodedName = decodeUploadFilename(req.file.originalname)
            const ext = path.extname(decodedName)
            const safeFileName = `${timestamp}-${randomStr}${ext}`
            const filePath = path.join(UPLOAD_DIR, safeFileName)

            await fs.writeFile(filePath, req.file.buffer)

            const relativePath = path.join('uploads', 'legal_ethics', safeFileName).replace(/\\/g, '/')

            updates.filePath = relativePath
            updates.fileName = decodedName
            updates.mimeType = req.file.mimetype
            updates.fileSize = req.file.size

            // ลบไฟล์เก่า
            try {
                const oldPath = await LegalEthics.getFilePath(id)
                if (oldPath && oldPath.file_path) {
                    await fs.unlink(path.resolve(oldPath.file_path))
                }
            } catch (err) {
                console.warn('Failed to delete old file:', err)
            }
        }

        const updatedDoc = await LegalEthics.findByIdAndUpdate(id, updates)
        res.json({ message: 'อัปเดตข้อมูลสำเร็จ', doc: updatedDoc })
    } catch (error) {
        console.error('Update error:', error)
        res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลได้' })
    }
})

// ลบข้อมูล (Admin only)
router.delete('/:id', requireAuth, requirePermission('legal_ethics'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const id = req.params.id
        const fileData = await LegalEthics.findByIdAndDelete(id)

        if (fileData && fileData.file_path) {
            try {
                await fs.unlink(path.resolve(fileData.file_path))
            } catch (err) {
                console.error('Failed to delete physical file:', err)
            }
        }

        res.json({ message: 'ลบข้อมูลสำเร็จ' })
    } catch (error) {
        console.error('Delete error:', error)
        res.status(500).json({ error: 'ไม่สามารถลบข้อมูลได้' })
    }
})

// เรียงลำดับใหม่ (Admin only)
router.post('/reorder', requireAuth, requirePermission('legal_ethics'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const { items } = req.body
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' })
        }

        await LegalEthics.reorder(items)
        res.json({ message: 'เรียงลำดับสำเร็จ' })
    } catch (error) {
        console.error('Reorder error:', error)
        res.status(500).json({ error: 'ไม่สามารถเรียงลำดับได้' })
    }
})

export default router
