import { Router } from 'express'
import { signToken, signRefreshToken, requireAuth, requireRefreshToken } from '../middleware/auth.js'
import { authLimiter, createRateLimiter } from '../middleware/ratelimit.js'
import { validate, loginSchema } from '../utils/validation.js'
import { logger } from '../utils/logger.js'
import User from '../models/mysql/User.js'
import bcryptPkg from 'bcryptjs'
const { compare, hash } = bcryptPkg

const router = Router()

// Limit login attempts per IP to reduce brute-force risk
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { username, password } = req.body
  const allowEnvFallback = String(process.env.AUTH_ALLOW_ENV_FALLBACK).toLowerCase() === 'true'
  const isProduction = process.env.NODE_ENV === 'production'

  const sessionCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  }

  const refreshCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }

  try {
    // If DB is connected, validate against users collection
    if (req.app.locals.dbConnected) {
      try {
        const user = await User.findOne({ username })
        if (user) {
          const ok = await compare(password, user.passwordHash)
          if (!ok) {
            logger.warn('Failed login attempt', { ip: req.ip, username, method: 'db' })
            return res.status(401).json({ error: 'Invalid credentials' })
          }
          const token = signToken({ sub: user._id.toString(), username: user.username, roles: user.roles })
          const refreshToken = signRefreshToken({ sub: user._id.toString(), username: user.username, roles: user.roles })
          // Also set httpOnly cookie for stronger security (frontend can still use token if desired)
          try {
            res.cookie('ph_token', token, sessionCookieOptions)
            res.cookie('ph_refresh_token', refreshToken, refreshCookieOptions)
          } catch {}
          return res.json({ token, user: { username: user.username, roles: user.roles }, source: 'db' })
        }
      } catch (dbErr) {
        if (!allowEnvFallback) {
          console.warn('[auth] DB login failed and env fallback disabled:', dbErr?.message)
          return res.status(500).json({ error: 'Login failed (DB)', details: dbErr?.message })
        }
        console.warn('[auth] DB login failed, falling back to env login:', dbErr?.message)
      }
    }
    // Fallback to env-based login (if allowed)
    if (!allowEnvFallback) return res.status(401).json({ error: 'Invalid credentials' })
    const DEMO_USER = process.env.ADMIN_USER || 'admin'
    const DEMO_PASS = process.env.ADMIN_PASS || '1234'
    if (username === DEMO_USER && password === DEMO_PASS) {
      const roles = ['admin']
      const token = signToken({ sub: 'admin', username, roles })
      const refreshToken = signRefreshToken({ sub: 'admin', username, roles })
      try {
        res.cookie('ph_token', token, sessionCookieOptions)
        res.cookie('ph_refresh_token', refreshToken, refreshCookieOptions)
      } catch {}
      return res.json({ token, user: { username, roles }, source: 'env' })
    }
    logger.warn('Failed login attempt', { ip: req.ip, username, method: 'env' })
    return res.status(401).json({ error: 'Invalid credentials' })
  } catch (e) {
    return res.status(500).json({ error: 'Login failed', details: e?.message })
  }
})

export default router

// Refresh access token using refresh token
router.post('/refresh', requireRefreshToken, (req, res) => {
  try {
    const user = req.user
    const newToken = signToken({ sub: user.sub, username: user.username, roles: user.roles })
    const newRefreshToken = signRefreshToken({ sub: user.sub, username: user.username, roles: user.roles })

    const isProduction = process.env.NODE_ENV === 'production'
    const sessionCookieOptions = {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    }
    const refreshCookieOptions = {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }

    // Update cookies
    res.cookie('ph_token', newToken, sessionCookieOptions)
    res.cookie('ph_refresh_token', newRefreshToken, refreshCookieOptions)

    return res.json({ token: newToken, user: { username: user.username, roles: user.roles } })
  } catch (e) {
    logger.error('Token refresh failed', { error: e.message, user: req.user?.username })
    return res.status(500).json({ error: 'Token refresh failed' })
  }
})

// Logout - clear tokens
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('ph_token', { path: '/' })
    res.clearCookie('ph_refresh_token', { path: '/' })
    return res.json({ ok: true, message: 'Logged out successfully' })
  } catch (e) {
    logger.error('Logout failed', { error: e.message })
    return res.status(500).json({ error: 'Logout failed' })
  }
})

// Change password (DB-backed users only)
// Fairly strict limit since this is a sensitive endpoint
router.post('/change-password', requireAuth, createRateLimiter({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' })
  if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' })
  try {
    if (!req.app.locals.dbConnected) {
      return res.status(503).json({ error: 'ไม่สามารถเปลี่ยนรหัสได้ (ฐานข้อมูลไม่พร้อมใช้งาน)' })
    }
    const username = req.user?.username
    if (!username) return res.status(401).json({ error: 'Unauthorized' })
    const user = await User.findOne({ username })
    if (!user) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' })
    const ok = await compare(currentPassword, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' })
    const passwordHash = await hash(newPassword, 10)
    await User.updateOne(
      { username },
      { $set: { username, passwordHash, roles: user.roles || ['admin'] } },
      { upsert: false }
    )
    return res.json({ ok: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
  } catch (e) {
    console.error('[auth/change-password] error:', e?.message)
    return res.status(500).json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', details: e?.message })
  }
})
