import { Router } from 'express'
import { requireAuth, optionalAuth, requirePermission, userHasPermission } from '../middleware/auth.js'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import PRPlan from '../models/mysql/PRPlan.js'
import { toPublicDTO, toAdminDTO, toPublicDTOList, toAdminDTOList } from '../dto/PRPlanDTO.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { decodeUploadFilename, contentDisposition } from '../utils/filename.js'

const router = Router()

// Rate limiting
router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

// กำหนดโฟลเดอร์สำหรับเก็บไฟล์ PDF
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pr_plans')

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

/**
 * GET /api/pr-plans
 * ดึงรายการ PR Plans ทั้งหมด
 */
router.get('/', optionalAuth, async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const { search, page = 1, limit = 20, isPublished } = req.query
        const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)

        let isPublishedFilter
        if (isAdmin) {
            // Admin: Check if specific filter requested
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
            search,
            page: pageNum,
            limit: limitNum,
            limit: limitNum,
            isPublished: isPublishedFilter,
            excludeContent: true // Optimized: Don't load full description for list views
        }

        const [plans, total] = await Promise.all([
            PRPlan.findAll(filters),
            PRPlan.count(filters)
        ])

        const result = isAdmin ? toAdminDTOList(plans) : toPublicDTOList(plans)

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
        console.error('[pr-plans] GET error:', e.message)
        res.status(500).json({ error: 'Failed to fetch PR plans' })
    }
})

/**
 * GET /api/pr-plans/:id
 * ดึงข้อมูล PR Plan (ไม่รวมไฟล์)
 */
router.get('/:id', optionalAuth, async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const plan = await PRPlan.findById(req.params.id)

        if (!plan) {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        // ตรวจสอบสิทธิ์ถ้า PR Plan ไม่ได้เผยแพร่
        if (!plan.is_published) {
            const isAdmin = userHasPermission(req.user, 'pr_plan') || userHasPermission(req.user, 'admin')
            if (!isAdmin) {
                return res.status(404).json({ error: 'PR Plan not found' })
            }
        }

        // ส่งข้อมูลเต็มเหมือน announcements API
        res.json(plan)
    } catch (e) {
        console.error('[pr-plans] GET :id error:', e.message)
        res.status(500).json({ error: 'Failed to fetch PR plan' })
    }
})

/**
 * GET /api/pr-plans/:id/view (และ /:id/view/:filename)
 * ดู PDF แบบ inline (ไม่ดาวน์โหลด)
 */
router.get(['/:id/view', '/:id/view/:filename'], async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const plan = await PRPlan.findById(req.params.id)

        if (!plan) {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        // ถ้าไม่ได้ login ให้ดูได้เฉพาะที่เผยแพร่
        if (!req.user && !plan.is_published) {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        // ดึง file path
        const fileInfo = await PRPlan.getFilePath(plan.id)

        if (!fileInfo || !fileInfo.file_path) {
            return res.status(404).json({ error: 'File not found' })
        }

        const filePath = path.join(process.cwd(), fileInfo.file_path)

        // ตรวจสอบว่าไฟล์มีอยู่จริง
        if (!existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' })
        }

        // ส่งไฟล์แบบ inline (แสดงใน browser)
        res.setHeader('Content-Type', fileInfo.mime_type || 'application/pdf')
        res.setHeader('Content-Disposition', contentDisposition('inline', fileInfo.file_name))

        res.sendFile(filePath)
    } catch (e) {
        console.error('[pr-plans] GET :id/view error:', e.message)
        res.status(500).json({ error: 'Failed to view PR plan' })
    }
})

/**
 * GET /api/pr-plans/:id/download (และ /:id/download/:filename)
 * ดาวน์โหลดไฟล์ PDF
 */
router.get(['/:id/download', '/:id/download/:filename'], async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const plan = await PRPlan.findById(req.params.id)

        if (!plan) {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        // ตรวจสอบว่า PR Plan เผยแพร่หรือไม่
        if (!plan.is_published) {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        // ดึง file path
        const fileInfo = await PRPlan.getFilePath(plan.id)

        if (!fileInfo || !fileInfo.file_path) {
            return res.status(404).json({ error: 'File not found' })
        }

        const filePath = path.join(process.cwd(), fileInfo.file_path)

        // ตรวจสอบว่าไฟล์มีอยู่จริง
        if (!existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' })
        }

        // เพิ่มจำนวนดาวน์โหลด
        await PRPlan.incrementDownloadCount(plan.id)

        // ส่งไฟล์
        res.setHeader('Content-Type', fileInfo.mime_type)
        res.setHeader('Content-Disposition', contentDisposition('attachment', fileInfo.file_name))

        res.sendFile(filePath)
    } catch (e) {
        console.error('[pr-plans] GET :id/download error:', e.message)
        res.status(500).json({ error: 'Failed to download PR plan' })
    }
})

/**
 * POST /api/pr-plans
 * สร้าง PR Plan ใหม่พร้อมอัปโหลดไฟล์ PDF
 */
router.post('/', requireAuth, requirePermission('pr_plan'), upload.single('file'), async (req, res) => {
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
            console.warn('[pr-plans] fileTypeFromBuffer failed:', e?.message)
        }

        const detectedMime = fileType?.mime
        const declaredMime = req.file.mimetype

        // ตรวจสอบว่าเป็น PDF หรือไม่
        const isPDF = declaredMime === 'application/pdf' || detectedMime === 'application/pdf'

        if (!isPDF) {
            return res.status(400).json({
                error: 'Invalid file type',
                details: 'Only PDF files are allowed'
            })
        }

        // ดึงข้อมูลจาก request body
        const { title, description, isPublished, displayOrder } = req.body

        // Sanitize inputs
        const sanitizedTitle = title ? sanitizeText(title) : ''
        const sanitizedDescription = description ? sanitizeHtml(description) : ''

        if (!sanitizedTitle) {
            return res.status(400).json({ error: 'Title is required' })
        }

        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const decodedName = decodeUploadFilename(req.file.originalname)
        const ext = path.extname(decodedName)
        const safeFileName = `${timestamp}-${randomStr}${ext}`
        const filePath = path.join(UPLOAD_DIR, safeFileName)

        // บันทึกไฟล์ลงโฟลเดอร์ uploads/pr_plans
        await fs.writeFile(filePath, req.file.buffer)

        // เก็บ relative path ในฐานข้อมูล
        const relativePath = path.join('uploads', 'pr_plans', safeFileName).replace(/\\/g, '/')

        // สร้าง PR Plan
        const plan = await PRPlan.create({
            title: sanitizedTitle,
            description: sanitizedDescription,
            filePath: relativePath,
            fileName: decodedName,
            mimeType: 'application/pdf',
            fileSize: req.file.size,
            isPublished: isPublished === 'true' || isPublished === true,
            displayOrder: displayOrder ? parseInt(displayOrder) : 0,
            createdBy: req.user?.username
        })

        // Purge cache
        purgeCachePrefix('/api/pr-plans')

        // ดึงข้อมูล PR Plan ที่สร้างเสร็จแล้ว
        const createdPlan = await PRPlan.findById(plan.id)
        res.status(201).json(toAdminDTO(createdPlan))
    } catch (e) {
        console.error('[pr-plans] POST error:', e.message)

        if (e.message.includes('ขนาดไฟล์เกินกำหนด')) {
            return res.status(400).json({ error: e.message })
        }

        res.status(500).json({ error: 'Failed to create PR plan', details: e.message })
    }
})

/**
 * PUT /api/pr-plans/:id
 * อัปเดตข้อมูล PR Plan (และไฟล์ถ้ามี)
 */
router.put('/:id', requireAuth, requirePermission('pr_plan'), upload.single('file'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const { title, description, isPublished, displayOrder } = req.body

        const payload = {}

        if (title !== undefined) {
            payload.title = sanitizeText(title)
        }

        if (description !== undefined) {
            payload.description = sanitizeHtml(description)
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
                console.warn('[pr-plans] fileTypeFromBuffer failed:', e?.message)
            }

            const detectedMime = fileType?.mime
            const declaredMime = req.file.mimetype
            const isPDF = declaredMime === 'application/pdf' || detectedMime === 'application/pdf'

            if (!isPDF) {
                return res.status(400).json({
                    error: 'Invalid file type',
                    details: 'Only PDF files are allowed'
                })
            }

            // ลบไฟล์เก่า
            const oldPlan = await PRPlan.getFilePath(req.params.id)
            if (oldPlan && oldPlan.file_path) {
                const oldFilePath = path.join(process.cwd(), oldPlan.file_path)
                try {
                    if (existsSync(oldFilePath)) {
                        await fs.unlink(oldFilePath)
                    }
                } catch (e) {
                    console.warn('[pr-plans] Failed to delete old file:', e.message)
                }
            }

            // บันทึกไฟล์ใหม่
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(7)
            const decodedName = decodeUploadFilename(req.file.originalname)
            const ext = path.extname(decodedName)
            const safeFileName = `${timestamp}-${randomStr}${ext}`
            const filePath = path.join(UPLOAD_DIR, safeFileName)

            await fs.writeFile(filePath, req.file.buffer)

            const relativePath = path.join('uploads', 'pr_plans', safeFileName).replace(/\\/g, '/')

            payload.filePath = relativePath
            payload.fileName = decodedName
            payload.mimeType = 'application/pdf'
            payload.fileSize = req.file.size
        }

        payload.updatedBy = req.user?.username

        await PRPlan.findByIdAndUpdate(req.params.id, payload)

        // Purge cache
        purgeCachePrefix('/api/pr-plans')

        // ดึงข้อมูล PR Plan ที่อัปเดตแล้ว
        const updatedPlan = await PRPlan.findById(req.params.id)
        res.json(toAdminDTO(updatedPlan))
    } catch (e) {
        console.error('[pr-plans] PUT error:', e.message)

        if (e.message === 'PR Plan not found') {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        res.status(500).json({ error: 'Failed to update PR plan' })
    }
})

/**
 * DELETE /api/pr-plans/:id
 * ลบ PR Plan
 */
router.delete('/:id', requireAuth, requirePermission('pr_plan'), async (req, res) => {
    if (!req.app.locals.dbConnected) {
        return res.status(503).json({ error: 'Database unavailable' })
    }

    try {
        const result = await PRPlan.findByIdAndDelete(req.params.id)

        // ลบไฟล์จริง
        if (result.filePath) {
            const filePath = path.join(process.cwd(), result.filePath)
            try {
                if (existsSync(filePath)) {
                    await fs.unlink(filePath)
                }
            } catch (e) {
                console.warn('[pr-plans] Failed to delete file:', e.message)
            }
        }

        // Purge cache
        purgeCachePrefix('/api/pr-plans')

        res.json({ ok: true })
    } catch (e) {
        console.error('[pr-plans] DELETE error:', e.message)

        if (e.message === 'PR Plan not found') {
            return res.status(404).json({ error: 'PR Plan not found' })
        }

        res.status(500).json({ error: 'Failed to delete PR plan' })
    }
})

export default router
