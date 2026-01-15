import express from 'express'
import Feedback from '../models/mysql/Feedback.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// ฟังก์ชัน sanitize input ตาม OWASP
function sanitizeInput(input) {
    if (!input) return input

    // ลบ whitespace ที่ไม่จำเป็นออก
    let sanitized = input.trim()

    // ลบ HTML tags ทั้งหมด (ป้องกัน XSS)
    sanitized = sanitized.replace(/<[^>]*>/g, '')

    // ลบ script tags และ event handlers
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '')
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')

    // ลบ null bytes
    sanitized = sanitized.replace(/\0/g, '')

    return sanitized
}

// ตรวจสอบ SQL Injection patterns
function containsSQLInjection(input) {
    if (!input) return false

    const sqlPatterns = [
        /('|(\-\-)|(;)|(\|\|)|(\*))/i,  // SQL special characters
        /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,  // SQL keywords
        /(script|javascript|onerror|onload)/i  // XSS patterns
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
}

// ตรวจสอบตัวอักษรพิเศษ
function isValidInput(input, allowSpecialChars = false) {
    if (!input) return true

    // อนุญาต: ภาษาไทย, ภาษาอังกฤษ, ตัวเลข, ช่องว่าง, ขีดคั่นพื้นฐาน
    if (allowSpecialChars) {
        // สำหรับ message ที่อนุญาตอักขระพิเศษมากขึ้น
        return /^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()\-@#%&*+=\n\r]+$/.test(input)
    }

    // สำหรับ name, subject (เข้มงวดกว่า)
    return /^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()\-]+$/.test(input)
}

// Rate limiter สำหรับการส่งความคิดเห็น (5 ครั้งต่อ 15 นาที)
const feedbackLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 5, // จำกัด 5 ครั้ง
    message: 'คุณส่งความคิดเห็นบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
})

/**
 * POST /api/feedback
 * สร้างความคิดเห็นใหม่ (Public endpoint with rate limiting)
 */
router.post('/', feedbackLimiter, async (req, res) => {
    try {
        let { name, email, phone, subject, message } = req.body

        // Validation - ตรวจสอบข้อมูลที่จำเป็น
        if (!name || !subject || !message) {
            return res.status(400).json({
                error: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                details: 'ชื่อ, หัวข้อ และข้อความเป็นข้อมูลที่จำเป็น'
            })
        }

        // ตรวจสอบ SQL Injection
        if (containsSQLInjection(name) || containsSQLInjection(subject) || containsSQLInjection(message)) {
            logger.warn(`[Feedback] SQL Injection attempt detected from IP: ${req.ip}`)
            return res.status(400).json({
                error: 'ข้อมูลไม่ถูกต้อง',
                details: 'พบอักขระที่ไม่อนุญาตในข้อมูล'
            })
        }

        // Sanitize inputs (ป้องกัน XSS)
        name = sanitizeInput(name)
        subject = sanitizeInput(subject)
        message = sanitizeInput(message)
        email = email ? sanitizeInput(email) : null
        phone = phone ? sanitizeInput(phone) : null

        // ตรวจสอบความยาวหลัง sanitize
        if (name.length === 0 || subject.length === 0 || message.length === 0) {
            return res.status(400).json({
                error: 'ข้อมูลไม่ถูกต้อง',
                details: 'ข้อมูลที่กรอกมีเฉพาะอักขระพิเศษที่ไม่อนุญาต'
            })
        }

        // ตรวจสอบความยาว
        if (name.length > 100) {
            return res.status(400).json({
                error: 'ชื่อยาวเกินไป',
                details: 'ชื่อต้องไม่เกิน 100 ตัวอักษร'
            })
        }

        if (subject.length > 200) {
            return res.status(400).json({
                error: 'หัวข้อยาวเกินไป',
                details: 'หัวข้อต้องไม่เกิน 200 ตัวอักษร'
            })
        }

        if (message.length > 5000) {
            return res.status(400).json({
                error: 'ข้อความยาวเกินไป',
                details: 'ข้อความต้องไม่เกิน 5000 ตัวอักษร'
            })
        }

        // ตรวจสอบตัวอักษรที่อนุญาต
        if (!isValidInput(name, false)) {
            return res.status(400).json({
                error: 'ชื่อมีอักขระที่ไม่อนุญาต',
                details: 'กรุณาใช้เฉพาะภาษาไทย ภาษาอังกฤษ ตัวเลข และเครื่องหมายพื้นฐาน'
            })
        }

        if (!isValidInput(subject, false)) {
            return res.status(400).json({
                error: 'หัวข้อมีอักขระที่ไม่อนุญาต',
                details: 'กรุณาใช้เฉพาะภาษาไทย ภาษาอังกฤษ ตัวเลข และเครื่องหมายพื้นฐาน'
            })
        }

        if (!isValidInput(message, true)) {
            return res.status(400).json({
                error: 'ข้อความมีอักขระที่ไม่อนุญาต',
                details: 'พบอักขระพิเศษที่ไม่อนุญาต'
            })
        }

        // ตรวจสอบรูปแบบอีเมล (ถ้ามี)
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'รูปแบบอีเมลไม่ถูกต้อง',
                    details: 'กรุณากรอกอีเมลที่ถูกต้อง'
                })
            }

            // ตรวจสอบความยาวอีเมล
            if (email.length > 255) {
                return res.status(400).json({
                    error: 'อีเมลยาวเกินไป',
                    details: 'อีเมลต้องไม่เกิน 255 ตัวอักษร'
                })
            }
        }

        // ตรวจสอบเบอร์โทร (ถ้ามี)
        if (phone) {
            // อนุญาตเฉพาะตัวเลข, -, (, ), +, ช่องว่าง
            if (!/^[0-9\s\-\(\)\+]+$/.test(phone)) {
                return res.status(400).json({
                    error: 'เบอร์โทรไม่ถูกต้อง',
                    details: 'กรุณากรอกเฉพาะตัวเลขและเครื่องหมาย - ( ) +'
                })
            }

            if (phone.length > 20) {
                return res.status(400).json({
                    error: 'เบอร์โทรยาวเกินไป',
                    details: 'เบอร์โทรต้องไม่เกิน 20 ตัวอักษร'
                })
            }
        }

        // สร้างความคิดเห็น (ข้อมูลถูก sanitize แล้ว)
        const feedback = await Feedback.create({
            name,
            email,
            phone,
            subject,
            message
        })

        logger.info(`[Feedback] New feedback created: ID ${feedback.id} from ${name}`)

        res.status(201).json({
            success: true,
            message: 'ส่งความคิดเห็นสำเร็จ ขอบคุณที่ให้ความสนใจ',
            data: {
                id: feedback.id,
                created_at: feedback.created_at
            }
        })
    } catch (error) {
        logger.error('[Feedback] Error creating feedback:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการส่งความคิดเห็น',
            details: process.env.NODE_ENV === 'development' ? error.message : 'กรุณาลองใหม่อีกครั้ง'
        })
    }
})

/**
 * GET /api/feedback
 * ดึงข้อมูลความคิดเห็นทั้งหมด (Admin only)
 */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { status, limit = 50, offset = 0, search } = req.query

        const feedbacks = await Feedback.findAll({
            status,
            limit: parseInt(limit),
            offset: parseInt(offset),
            search
        })

        const total = await Feedback.count({ status, search })

        res.json({
            success: true,
            data: feedbacks,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + feedbacks.length) < total
            }
        })
    } catch (error) {
        logger.error('[Feedback] Error fetching feedbacks:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            details: error.message
        })
    }
})

/**
 * GET /api/feedback/stats
 * ดึงสถิติความคิดเห็น (Admin only)
 */
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const stats = await Feedback.countByStatus()

        res.json({
            success: true,
            data: stats
        })
    } catch (error) {
        logger.error('[Feedback] Error fetching stats:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการดึงสถิติ',
            details: error.message
        })
    }
})

/**
 * GET /api/feedback/:id
 * ดึงข้อมูลความคิดเห็นตาม ID (Admin only)
 */
router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)

        if (!feedback) {
            return res.status(404).json({
                error: 'ไม่พบข้อมูลความคิดเห็น'
            })
        }

        res.json({
            success: true,
            data: feedback
        })
    } catch (error) {
        logger.error('[Feedback] Error fetching feedback:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            details: error.message
        })
    }
})

/**
 * PATCH /api/feedback/:id/status
 * อัปเดตสถานะความคิดเห็น (Admin only)
 */
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { status } = req.body

        if (!status) {
            return res.status(400).json({
                error: 'กรุณาระบุสถานะ'
            })
        }

        // ดึงชื่อผู้ใช้จาก token
        const readBy = req.user?.username || req.user?.email || 'Admin'

        const feedback = await Feedback.updateStatus(req.params.id, status, readBy)

        if (!feedback) {
            return res.status(404).json({
                error: 'ไม่พบข้อมูลความคิดเห็น'
            })
        }

        logger.info(`[Feedback] Status updated: ID ${req.params.id} -> ${status} by ${readBy}`)

        res.json({
            success: true,
            message: 'อัปเดตสถานะสำเร็จ',
            data: feedback
        })
    } catch (error) {
        logger.error('[Feedback] Error updating status:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
            details: error.message
        })
    }
})

/**
 * PATCH /api/feedback/:id/reply
 * เพิ่มคำตอบจากผู้ดูแลระบบ (Admin only)
 */
router.patch('/:id/reply', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { reply } = req.body

        if (!reply) {
            return res.status(400).json({
                error: 'กรุณากรอกคำตอบ'
            })
        }

        if (reply.length > 5000) {
            return res.status(400).json({
                error: 'คำตอบยาวเกินไป',
                details: 'คำตอบต้องไม่เกิน 5000 ตัวอักษร'
            })
        }

        const feedback = await Feedback.addReply(req.params.id, reply.trim())

        if (!feedback) {
            return res.status(404).json({
                error: 'ไม่พบข้อมูลความคิดเห็น'
            })
        }

        logger.info(`[Feedback] Reply added: ID ${req.params.id}`)

        res.json({
            success: true,
            message: 'เพิ่มคำตอบสำเร็จ',
            data: feedback
        })
    } catch (error) {
        logger.error('[Feedback] Error adding reply:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการเพิ่มคำตอบ',
            details: error.message
        })
    }
})

/**
 * DELETE /api/feedback/:id
 * ลบความคิดเห็น (Admin only)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const deleted = await Feedback.delete(req.params.id)

        if (!deleted) {
            return res.status(404).json({
                error: 'ไม่พบข้อมูลความคิดเห็น'
            })
        }

        logger.info(`[Feedback] Feedback deleted: ID ${req.params.id}`)

        res.json({
            success: true,
            message: 'ลบความคิดเห็นสำเร็จ'
        })
    } catch (error) {
        logger.error('[Feedback] Error deleting feedback:', error)
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการลบความคิดเห็น',
            details: error.message
        })
    }
})

export default router
