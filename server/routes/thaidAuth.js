import { Router } from 'express'
import crypto from 'crypto'
import { getThaIDClient } from '../services/thaidClient.js'
import { query } from '../database.js'
import { signToken, requireAuth, optionalAuth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import User from '../models/mysql/User.js'

const router = Router()

// เก็บ state และ nonce ชั่วคราว (ใน production ควรใช้ Redis)
const pendingStates = new Map()

// ทำความสะอาด expired states ทุก 5 นาที
setInterval(() => {
    const now = Date.now()
    for (const [state, data] of pendingStates.entries()) {
        if (data.expiresAt < now) {
            pendingStates.delete(state)
        }
    }
}, 5 * 60 * 1000)

/**
 * GET /api/auth/thaid/login
 * เริ่มต้น ThaID OAuth flow
 * Query params:
 *   - link=true: โหมดเชื่อมต่อ ThaID กับ account ที่ login อยู่
 */
router.get('/login', optionalAuth, async (req, res) => {
    try {
        const client = await getThaIDClient()

        // ตรวจสอบว่าเป็นโหมด "link" หรือไม่
        const isLinkMode = req.query.link === 'true'
        const userId = req.user?.sub || req.user?.id

        // ถ้าเป็นโหมด link ต้อง login อยู่ก่อน
        if (isLinkMode && !userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'You must be logged in to link ThaID account'
            })
        }

        // สร้าง state และ nonce สำหรับป้องกัน CSRF และ replay attacks
        const state = crypto.randomBytes(32).toString('hex')
        const nonce = crypto.randomBytes(32).toString('hex')

        // เก็บ state และ nonce ไว้ตรวจสอบตอน callback (หมดอายุใน 5 นาที)
        pendingStates.set(state, {
            nonce,
            expiresAt: Date.now() + 5 * 60 * 1000,
            linkMode: isLinkMode,  // บันทึกว่าเป็นโหมด link หรือไม่
            userId: isLinkMode ? userId : null,  // บันทึก userId ถ้าเป็นโหมด link
        })

        // สร้าง Authorization URL
        const authUrl = client.authorizationUrl({
            scope: process.env.THAID_SCOPES || 'openid pid name birthdate address',
            state: state,
            nonce: nonce,
        })

        logger.info('[ThaID] Login initiated', { state, linkMode: isLinkMode })
        res.redirect(authUrl)
    } catch (error) {
        logger.error('[ThaID] Login failed', { error: error.message })

        // ถ้าเป็น error เรื่อง credentials ไม่ครบ ให้แสดง error message ที่ชัดเจน
        if (error.message.includes('credentials not configured')) {
            return res.status(503).json({
                error: 'ThaID login is not available',
                message: 'ThaID authentication is not configured on this server. Please contact the administrator.',
            })
        }

        res.redirect('/login?error=thaid_init_failed')
    }
})

/**
 * GET /api/auth/thaid/callback
 * รับ callback จาก ThaID หลังจากผู้ใช้ยืนยันตัวตน
 */
router.get('/callback', async (req, res) => {
    try {
        const client = await getThaIDClient()
        const params = client.callbackParams(req)

        // ตรวจสอบ state
        const savedState = pendingStates.get(params.state)
        if (!savedState) {
            logger.warn('[ThaID] Invalid or expired state', { state: params.state })
            return res.redirect('/login?error=invalid_state')
        }

        // ลบ state ที่ใช้แล้ว
        pendingStates.delete(params.state)

        // แลก authorization code เป็น tokens
        const tokenSet = await client.callback(
            process.env.THAID_REDIRECT_URI,
            params,
            {
                nonce: savedState.nonce,
                state: params.state,
            }
        )

        // ดึงข้อมูลผู้ใช้จาก ThaID
        const userinfo = await client.userinfo(tokenSet.access_token)

        logger.info('[ThaID] User info received', {
            sub: userinfo.sub,
            pid: userinfo.pid,
        })

        // ข้อมูลที่ได้จาก ThaID
        const {
            sub, // ThaID Subject ID (unique identifier)
            pid, // เลขบัตรประชาชน 13 หลัก
            given_name, // ชื่อ
            family_name, // นามสกุล
            birthdate, // วันเกิด (YYYY-MM-DD)
            address, // ที่อยู่
        } = userinfo

        let user

        // ตรวจสอบว่าเป็นโหมด link หรือไม่
        if (savedState.linkMode && savedState.userId) {
            // โหมด Link: เชื่อมต่อ ThaID กับ account ที่ login อยู่
            user = await linkThaIDToExistingUser(savedState.userId, {
                sub,
                pid,
                given_name,
                family_name,
                birthdate,
                address,
            })
        } else {
            // โหมด Login: ค้นหาหรือสร้าง User
            user = await findOrCreateUserFromThaID({
                sub,
                pid,
                given_name,
                family_name,
                birthdate,
                address,
            })
        }

        // สร้าง JWT Token สำหรับระบบของคุณ
        const jwtToken = signToken({
            sub: user.id.toString(),
            username: user.username,
            roles: user.roles,
            permissions: user.permissions,
        })

        logger.info('[ThaID] Login successful', {
            userId: user.id,
            username: user.username,
            linkMode: savedState.linkMode,
        })

        // Redirect ไปหน้า Frontend พร้อม token
        const redirectUrl = `${process.env.THAID_REDIRECT_URI}?token=${jwtToken}`
        res.redirect(redirectUrl)
    } catch (error) {
        logger.error('[ThaID] Callback failed', { error: error.message })

        // ตรวจสอบว่าเป็น error เรื่อง ThaID ยังไม่ได้ link หรือไม่
        if (error.message.includes('ThaID_NOT_LINKED')) {
            return res.redirect('/login?error=thaid_not_linked')
        }

        // ตรวจสอบว่าเป็น error เรื่อง ThaID ถูกใช้โดย account อื่นแล้ว
        if (error.message.includes('already linked')) {
            return res.redirect('/login?error=thaid_already_used')
        }

        res.redirect('/login?error=thaid_auth_failed')
    }
})

/**
 * GET /api/auth/thaid/status
 * ดึงสถานะการเชื่อมต่อ ThaID ของผู้ใช้
 */
router.get('/status', requireAuth, async (req, res) => {
    try {
        // ต้อง authenticate ก่อน
        const userId = req.user?.sub || req.user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const users = await query(
            'SELECT thaid_pid, thaid_sub, thaid_linked_at, login_method FROM users WHERE id = ?',
            [userId]
        )

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }

        const user = users[0]
        const isLinked = Boolean(user.thaid_sub)

        res.json({
            isLinked,
            thaidPid: user.thaid_pid,
            linkedAt: user.thaid_linked_at,
            loginMethod: user.login_method,
        })
    } catch (error) {
        logger.error('[ThaID] Status check failed', { error: error.message })
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * POST /api/auth/thaid/unlink
 * ยกเลิกการเชื่อมต่อ ThaID
 */
router.post('/unlink', requireAuth, async (req, res) => {
    try {
        // ต้อง authenticate ก่อน (ใช้ middleware requireAuth)
        const userId = req.user?.sub || req.user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        await query(
            `UPDATE users SET 
        thaid_sub = NULL,
        thaid_pid = NULL,
        thaid_linked_at = NULL,
        login_method = 'local'
      WHERE id = ?`,
            [userId]
        )

        logger.info('[ThaID] Unlinked successfully', { userId })
        res.json({ success: true, message: 'ThaID unlinked successfully' })
    } catch (error) {
        logger.error('[ThaID] Unlink failed', { error: error.message })
        res.status(500).json({ success: false, error: error.message })
    }
})

/**
 * ฟังก์ชันค้นหาหรือสร้าง User จากข้อมูล ThaID
 */
async function findOrCreateUserFromThaID(thaidData) {
    const { sub, pid, given_name, family_name, birthdate, address } = thaidData

    // ค้นหา User ที่มี ThaID นี้อยู่แล้ว
    const existingUsers = await query(
        'SELECT * FROM users WHERE thaid_sub = ? OR thaid_pid = ?',
        [sub, pid]
    )

    if (existingUsers.length > 0) {
        const user = existingUsers[0]

        // อัพเดทข้อมูลล่าสุด
        await query(
            `UPDATE users SET 
        thaid_sub = ?,
        thaid_pid = ?,
        thaid_linked_at = NOW(),
        login_method = 'thaid',
        updated_at = NOW()
      WHERE id = ?`,
            [sub, pid, user.id]
        )

        logger.info('[ThaID] User updated', { userId: user.id })
        return User.findById(user.id)
    }

    // ❌ ไม่สร้าง User ใหม่อัตโนมัติ
    // ผู้ใช้ต้อง Login ด้วย username/password ก่อน แล้วค่อย Link ThaID ในหน้า Settings

    logger.warn('[ThaID] User not found, auto-creation disabled', { pid })

    throw new Error(
        'ThaID_NOT_LINKED: คุณยังไม่ได้เชื่อมต่อ ThaID กับบัญชีของคุณ ' +
        'กรุณา Login ด้วย Username/Password แล้วไปที่หน้า Settings เพื่อเชื่อมต่อ ThaID'
    )
}

/**
 * ฟังก์ชันเชื่อมต่อ ThaID กับ User ที่มีอยู่แล้ว
 */
async function linkThaIDToExistingUser(userId, thaidData) {
    const { sub, pid, given_name, family_name, birthdate, address } = thaidData

    // ตรวจสอบว่า User นี้มีอยู่จริง
    const user = await User.findById(userId)
    if (!user) {
        throw new Error('User not found')
    }

    // ตรวจสอบว่าเลขบัตรนี้ถูกใช้โดย account อื่นหรือไม่
    const existingUsers = await query(
        'SELECT id FROM users WHERE (thaid_sub = ? OR thaid_pid = ?) AND id != ?',
        [sub, pid, userId]
    )

    if (existingUsers.length > 0) {
        throw new Error('This ThaID is already linked to another account')
    }

    // เชื่อมต่อ ThaID กับ account นี้
    await query(
        `UPDATE users SET 
            thaid_sub = ?,
            thaid_pid = ?,
            thaid_linked_at = NOW(),
            updated_at = NOW()
        WHERE id = ?`,
        [sub, pid, userId]
    )

    logger.info('[ThaID] Linked to existing user', { userId, pid })
    return User.findById(userId)
}

export default router
