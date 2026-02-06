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
// Strict ThaID Endpoints (Manual)
const THAID_API_BASE = process.env.THAID_ISSUER || 'https://imauth.bora.dopa.go.th'
const ENDPOINTS = {
    AUTH: `${THAID_API_BASE}/api/v2/oauth2/auth/`,
    TOKEN: `${THAID_API_BASE}/api/v2/oauth2/token/`,
    USERINFO: `${THAID_API_BASE}/api/v2/oauth2/userinfo/`
}

/**
 * GET /api/auth/thaid/login
 * เริ่มต้น ThaID OAuth flow (Strict Manual Mode)
 */
router.get('/login', optionalAuth, async (req, res) => {
    try {
        const isLinkMode = req.query.link === 'true'
        const userId = req.user?.sub || req.user?.id

        logger.info('[ThaID] Login Init (Strict)', { isLinkMode, userId: userId || 'guest' })

        if (isLinkMode && !userId) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Must be logged in to link account' })
        }

        const state = crypto.randomBytes(16).toString('hex')

        // Store State in Signed Cookie
        res.cookie('thaid_state', { state, linkMode: isLinkMode, userId }, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true',
            signed: true,
            sameSite: 'lax',
            maxAge: 5 * 60 * 1000
        })

        const clientId = process.env.THAID_CLIENT_ID
        const redirectUri = process.env.THAID_REDIRECT_URI

        if (!clientId || !redirectUri) {
            throw new Error('Missing ThaID Environment Variables')
        }

        // Construct URL manually using URLSearchParams for correct encoding
        const authUrl = new URL(ENDPOINTS.AUTH)
        authUrl.searchParams.append('response_type', 'code')
        authUrl.searchParams.append('client_id', clientId)
        authUrl.searchParams.append('redirect_uri', redirectUri)
        authUrl.searchParams.append('scope', 'openid pid')
        authUrl.searchParams.append('state', state)

        logger.info('[ThaID] Redirecting to Auth URL', { url: authUrl.toString() })
        res.redirect(authUrl.toString())

    } catch (error) {
        logger.error('[ThaID] Login failed', { error: error.message })
        res.redirect(`/login?error=thaid_init_failed&details=${encodeURIComponent(error.message)}`)
    }
})

/**
 * GET /api/auth/thaid/callback
 * รับ callback (Strict Manual Mode)
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query
        logger.info('[ThaID] Callback received', { code: code ? 'YES' : 'NO', state, error })

        if (error) {
            throw new Error(`ThaID Error: ${error} - ${error_description}`)
        }

        if (!code) throw new Error('No authorization code received')

        // Verify State
        const savedState = req.signedCookies.thaid_state
        if (!savedState || savedState.state !== state) {
            logger.warn('[ThaID] State mismatch', { expected: savedState?.state, received: state })
            return res.redirect('/login?error=invalid_state')
        }
        res.clearCookie('thaid_state')

        // 1. Token Exchange (POST body as per Page 9)
        const tokenParams = new URLSearchParams()
        tokenParams.append('grant_type', 'authorization_code')
        tokenParams.append('code', code)
        tokenParams.append('redirect_uri', process.env.THAID_REDIRECT_URI)
        tokenParams.append('client_id', process.env.THAID_CLIENT_ID)
        tokenParams.append('client_secret', process.env.THAID_CLIENT_SECRET)

        logger.info('[ThaID] Exchanging Token', { endpoint: ENDPOINTS.TOKEN })

        const tokenResp = await fetch(ENDPOINTS.TOKEN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        })

        if (!tokenResp.ok) {
            const errText = await tokenResp.text()
            logger.error('[ThaID] Token Exchange Failed', { status: tokenResp.status, body: errText })
            throw new Error(`Token invalid: ${tokenResp.status} ${errText}`)
        }

        const tokenData = await tokenResp.json()
        const { access_token, id_token, token_type } = tokenData

        logger.info('[ThaID] Token Success', { type: token_type })

        // 2. UserInfo Fetch
        logger.info('[ThaID] Fetching UserInfo', { endpoint: ENDPOINTS.USERINFO })
        const userResp = await fetch(ENDPOINTS.USERINFO, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        })

        if (!userResp.ok) {
            const errText = await userResp.text()
            throw new Error(`UserInfo failed: ${userResp.status} ${errText}`)
        }

        const userinfo = await userResp.json()
        logger.info('[ThaID] UserInfo Success', { pid: userinfo.pid })

        // 3. Logic for Login/Link
        const { sub, pid, given_name, family_name, birthdate, address } = userinfo
        let user

        if (savedState.linkMode && savedState.userId) {
            user = await linkThaIDToExistingUser(savedState.userId, { sub, pid, given_name, family_name, birthdate, address })
        } else {
            user = await findOrCreateUserFromThaID({ sub, pid, given_name, family_name, birthdate, address })
        }

        const jwtToken = signToken({
            sub: user.id.toString(),
            username: user.username,
            roles: user.roles,
            permissions: user.permissions,
        })

        // Generate Refresh Token for session persistence
        const { signRefreshToken } = await import('../middleware/auth.js')
        const refreshToken = signRefreshToken({
            sub: user.id.toString(),
            username: user.username,
            roles: user.roles,
            permissions: user.permissions,
        })

        // Set cookies matching standard auth.js logic
        const isProduction = process.env.NODE_ENV === 'production'
        const sessionCookieOptions = {
            httpOnly: true,
            sameSite: isProduction ? 'strict' : 'lax',
            secure: isProduction || process.env.USE_HTTPS === 'true',
            path: '/',
            maxAge: 15 * 60 * 1000, // 15 minutes
        }

        const refreshCookieOptions = {
            httpOnly: true,
            sameSite: isProduction ? 'strict' : 'lax',
            secure: isProduction || process.env.USE_HTTPS === 'true',
            path: '/api/auth/refresh',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        }

        res.cookie('ph_token', jwtToken, sessionCookieOptions)
        res.cookie('ph_refresh_token', refreshToken, refreshCookieOptions)
        res.cookie('ph_last_activity', String(Date.now()), {
            httpOnly: true,
            secure: isProduction || process.env.USE_HTTPS === 'true',
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000
        })

        if (savedState.linkMode) {
            res.redirect('/admin/settings?thaid_linked=success')
        } else {
            res.redirect(`/login-success?token=${jwtToken}`)
        }

    } catch (error) {
        logger.error('[ThaID] Callback Exception', { msg: error.message, stack: error.stack })
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
