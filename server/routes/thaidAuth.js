import { Router } from 'express'
import * as openidClient from 'openid-client'
import crypto from 'crypto'
import { getThaIDClient } from '../services/thaidClient.js'
import { query } from '../database.js'
import { signToken, requireAuth, optionalAuth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import User from '../models/mysql/User.js'
import fs from 'fs'
import path from 'path'

// Direct debug logger
const logFile = path.join(process.cwd(), 'debug_thaid.log')
const debugLog = (msg, data = {}) => {
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}] ${msg} ${JSON.stringify(data)}\n`
    try {
        fs.appendFileSync(logFile, logLine)
    } catch (e) {
        console.error('Failed to write debug log', e)
    }
}


const router = Router()

/**
 * GET /api/auth/thaid/login
 * เริ่มต้น ThaID OAuth flow (Stateless - Uses Signed Cookies)
 */
router.get('/login', optionalAuth, async (req, res) => {
    try {
        const client = await getThaIDClient()
        const isLinkMode = req.query.link === 'true'
        const userId = req.user?.sub || req.user?.id

        logger.info('[ThaID] Login Init', { isLinkMode, userId: userId || 'guest', headers: req.headers })
        debugLog('Login Init', { isLinkMode, userId, query: req.query })


        if (isLinkMode && !userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'You must be logged in to link ThaID account'
            })
        }

        const state = crypto.randomBytes(16).toString('hex')

        // เก็บ State ลง Signed Cookie (ปลอดภัยและไม่หายเมื่อ Server Restart)
        // หมดอายุใน 5 นาที
        const stateData = {
            state,
            linkMode: isLinkMode,
            userId: isLinkMode ? userId : null,
        }

        res.cookie('thaid_state', stateData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true',
            signed: true,
            sameSite: 'lax', // Explicitly set SameSite
            maxAge: 5 * 60 * 1000
        })

        const issuerUrl = process.env.THAID_ISSUER || 'https://imauth.bora.dopa.go.th'
        const authEndpoint = `${issuerUrl}/api/v2/oauth2/auth/`
        const clientId = process.env.THAID_CLIENT_ID
        const redirectUri = encodeURIComponent(process.env.THAID_REDIRECT_URI)
        const scopeRaw = process.env.THAID_SCOPES || 'pid name birthdate openid'
        const scopeStr = scopeRaw.trim().replace(/\s+/g, '%20')

        const authUrl = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopeStr}&state=${state}`

        logger.info('[ThaID] Redirecting to Auth URL', { authUrl, state })
        res.redirect(authUrl)
    } catch (error) {
        logger.error('[ThaID] Login failed', { error: error.message, stack: error.stack })
        debugLog('Login failed', { error: error.message, stack: error.stack })

        if (error.message.includes('credentials not configured')) {
            return res.status(503).json({ error: 'ThaID login is not available' })
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
        logger.info('[ThaID] Callback received', { query: req.query, cookies: Object.keys(req.signedCookies || {}) })
        debugLog('Callback received', { query: req.query, cookies: Object.keys(req.signedCookies || {}) })


        const client = await getThaIDClient()
        const params = client.callbackParams(req)

        // อ่านและตรวจสอบ State จาก Signed Cookie
        const savedState = req.signedCookies.thaid_state

        logger.info('[ThaID] State Check', {
            receivedState: params.state,
            cookieState: savedState?.state,
            match: savedState?.state === params.state
        })
        debugLog('State Check', { paramsState: params.state, cookieState: savedState })


        if (!savedState || savedState.state !== params.state) {
            logger.warn('[ThaID] Invalid or expired state', {
                cookieState: savedState?.state,
                paramState: params.state
            })
            // หาก State ไม่ถูกต้อง อาจเกิดจาก Cookie หาย หรือ Timeout
            // แต่เพื่อ UX ที่ดี ถ้าเราตรวจสอบแล้วว่าไม่มี Cookie เราอาจจะ redirect ไปหน้า dashboard แทน error
            return res.redirect('/login?error=invalid_state')
        }

        // ลบ Cookie ทิ้งเมื่อใช้งานเสร็จ
        res.clearCookie('thaid_state')

        logger.info('[ThaID] Exchanging code for token...', { code: params.code })
        debugLog('Exchanging code', { code: params.code })


        const redirectUri = process.env.THAID_REDIRECT_URI
        const tokenSet = await openidClient.authorizationCodeGrant(
            client,
            new URL(req.originalUrl, `http://${req.headers.host}`),
            {
                expectedState: params.state,
                redirect_uri: redirectUri, // REQUIRED by ThaID
            }
        )

        logger.info('[ThaID] Token exchanged success', { claims: tokenSet.claims() })

        const userinfo = await openidClient.fetchUserInfo(client, tokenSet.access_token, tokenSet.claims())

        logger.info('[ThaID] User info received', {
            sub: userinfo.sub,
            pid: userinfo.pid,
            linkMode: savedState.linkMode,
            targetUserId: savedState.userId
        })

        const { sub, pid, given_name, family_name, birthdate, address } = userinfo
        let user

        if (savedState.linkMode && savedState.userId) {
            logger.info('[ThaID] Processing Link Mode', { userId: savedState.userId })
            user = await linkThaIDToExistingUser(savedState.userId, {
                sub, pid, given_name, family_name, birthdate, address
            })
            logger.info('[ThaID] Link Mode Success', { userId: user.id, loginMethod: user.login_method })
        } else {
            logger.info('[ThaID] Processing Login Mode')
            user = await findOrCreateUserFromThaID({
                sub, pid, given_name, family_name, birthdate, address
            })
        }

        const jwtToken = signToken({
            sub: user.id.toString(),
            username: user.username,
            roles: user.roles,
            permissions: user.permissions,
        })

        logger.info('[ThaID] Login/Link process completed', {
            userId: user.id,
            username: user.username,
            linkMode: savedState.linkMode,
        })

        if (savedState.linkMode) {
            logger.info('[ThaID] Redirecting to settings page')
            res.redirect('/admin/settings?thaid_linked=success')
        } else {
            logger.info('[ThaID] Redirecting to login success')
            const redirectUrl = `/login-success?token=${jwtToken}`
            res.redirect(redirectUrl)
        }
    } catch (error) {
        logger.error('[ThaID] Callback failed', { error: error.message, stack: error.stack })
        debugLog('Callback failed', { error: error.message, stack: error.stack })

        if (error.message.includes('ThaID_NOT_LINKED')) {
            return res.redirect('/login?error=thaid_not_linked')
        }
        if (error.message.includes('already linked')) {
            return res.redirect('/login?error=thaid_already_used')
        }
        if (error.message.includes('Database update failed')) {
            return res.redirect('/login?error=thaid_db_update_failed')
        }
        const safeError = encodeURIComponent(error.message.substring(0, 100))
        res.redirect(`/login?error=thaid_auth_failed&details=${safeError}`)
    }
})

/**
 * GET /api/auth/thaid/status
 */
router.get('/status', requireAuth, async (req, res) => {
    try {
        const userId = req.user?.sub || req.user?.id
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        // Debug query
        logger.info('[ThaID] Checking status for user', { userId })

        const users = await query(
            'SELECT thaid_pid, thaid_sub, thaid_linked_at, login_method FROM users WHERE id = ?',
            [userId]
        )

        if (users.length === 0) {
            logger.warn('[ThaID] User not found for status check', { userId })
            return res.status(404).json({ error: 'User not found' })
        }

        const user = users[0]
        const isLinked = Boolean(user.thaid_sub)

        logger.info('[ThaID] Status result', { userId, isLinked, pid: user.thaid_pid })

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
 */
router.post('/unlink', requireAuth, async (req, res) => {
    try {
        const userId = req.user?.sub || req.user?.id
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        await query(
            `UPDATE users SET thaid_sub = NULL, thaid_pid = NULL, thaid_linked_at = NULL, login_method = 'local' WHERE id = ?`,
            [userId]
        )

        logger.info('[ThaID] Unlinked successfully', { userId })
        res.json({ success: true, message: 'ThaID unlinked successfully' })
    } catch (error) {
        logger.error('[ThaID] Unlink failed', { error: error.message })
        res.status(500).json({ success: false, error: error.message })
    }
})

async function findOrCreateUserFromThaID(thaidData) {
    const { sub, pid, given_name, family_name, birthdate, address } = thaidData

    const existingUsers = await query(
        'SELECT * FROM users WHERE thaid_sub = ? OR thaid_pid = ?',
        [sub, pid]
    )

    if (existingUsers.length > 0) {
        const user = existingUsers[0]
        await query(
            `UPDATE users SET thaid_sub = ?, thaid_pid = ?, thaid_linked_at = NOW(), login_method = 'thaid', updated_at = NOW() WHERE id = ?`,
            [sub, pid, user.id]
        )
        logger.info('[ThaID] User updated (login)', { userId: user.id })
        return User.findById(user.id)
    }

    logger.warn('[ThaID] User not found, auto-creation disabled', { pid })
    throw new Error('ThaID_NOT_LINKED: คุณยังไม่ได้เชื่อมต่อ ThaID กับบัญชีของคุณ กรุณา Login ด้วย Username/Password แล้วไปที่หน้า Settings เพื่อเชื่อมต่อ ThaID')
}

async function linkThaIDToExistingUser(userId, thaidData) {
    const { sub, pid, given_name, family_name, birthdate, address } = thaidData

    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const existingUsers = await query(
        'SELECT id FROM users WHERE (thaid_sub = ? OR thaid_pid = ?) AND id != ?',
        [sub, pid, userId]
    )

    if (existingUsers.length > 0) throw new Error('This ThaID is already linked to another account')

    const result = await query(
        `UPDATE users SET thaid_sub = ?, thaid_pid = ?, thaid_linked_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [sub, pid, userId]
    )

    logger.info('[ThaID] Update result (Link)', { affectedRows: result.affectedRows, info: result.info, userId, pid })

    if (result.affectedRows === 0) {
        logger.error('[ThaID] Update failed: No rows affected', { userId, thaid_sub: sub })
        throw new Error('Database update failed: User not found or not updated')
    }

    logger.info('[ThaID] Linked to existing user', { userId, pid })
    return User.findById(userId)
}

export default router
