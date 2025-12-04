import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-devsecret-change-me'
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// Access token: short-lived (15 minutes)
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

// Refresh token: long-lived (30 days)
export function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' })
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET)
  } catch (e) {
    return null
  }
}

export function requireRefreshToken(req, res, next) {
  try {
    let refreshToken = req.cookies?.ph_refresh_token
    if (!refreshToken) {
      const cookieHeader = req.headers?.cookie || ''
      const match = cookieHeader.match(/(?:^|;\s*)ph_refresh_token=([^;]+)/)
      if (match) refreshToken = decodeURIComponent(match[1])
    }
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' })

    // Check inactivity timeout during refresh
    const lastActivity = req.cookies?.ph_last_activity
    const now = Date.now()

    // If last activity cookie is missing, it means it expired (user inactive > 30 mins)
    // Or if it exists but is too old (double check)
    if (!lastActivity || (Number.isFinite(Number(lastActivity)) && (now - Number(lastActivity)) > INACTIVITY_TIMEOUT_MS)) {
      res.clearCookie('ph_token')
      res.clearCookie('ph_refresh_token')
      res.clearCookie('ph_last_activity')
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'INACTIVITY_TIMEOUT' })
    }

    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) return res.status(401).json({ error: 'Invalid refresh token' })

    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Refresh token verification failed' })
  }
}

export function requireAuth(req, res, next) {
  try {
    const h = req.headers['authorization'] || ''
    const [type, token] = h.split(' ')
    let jwtToken = token
    if (type !== 'Bearer' || !jwtToken) {
      // Try cookie fallback
      const cookie = req.headers['cookie'] || ''
      const m = cookie.match(/(?:^|;\s*)ph_token=([^;]+)/)
      if (m) jwtToken = decodeURIComponent(m[1])
    }
    if (!jwtToken) return res.status(401).json({ error: 'Unauthorized' })
    const decoded = jwt.verify(jwtToken, JWT_SECRET)

    // Check inactivity timeout
    const lastActivity = req.cookies?.ph_last_activity
    const now = Date.now()
    if (lastActivity) {
      const lastActivityTime = Number.parseInt(lastActivity, 10)
      if (Number.isFinite(lastActivityTime) && (now - lastActivityTime) > INACTIVITY_TIMEOUT_MS) {
        // Clear cookies and return session expired
        res.clearCookie('ph_token')
        res.clearCookie('ph_refresh_token')
        res.clearCookie('ph_last_activity')
        return res.status(401).json({ error: 'Session expired due to inactivity', code: 'INACTIVITY_TIMEOUT' })
      }
    }

    // Update last activity time
    res.cookie('ph_last_activity', String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: INACTIVITY_TIMEOUT_MS
    })

    req.user = decoded
    next()
  } catch (e) {
    // If token is expired, suggest refresh
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function optionalAuth(req, _res, next) {
  const h = req.headers['authorization'] || ''
  const [type, token] = h.split(' ')
  let jwtToken = (type === 'Bearer') ? token : undefined
  if (!jwtToken) {
    const cookie = req.headers['cookie'] || ''
    const m = cookie.match(/(?:^|;\s*)ph_token=([^;]+)/)
    if (m) jwtToken = decodeURIComponent(m[1])
  }
  if (jwtToken) { try { req.user = jwt.verify(jwtToken, JWT_SECRET) } catch { } }
  next()
}

export function requireRole(role) {
  return function (req, res, next) {
    const u = req.user
    if (!u) return res.status(401).json({ error: 'Unauthorized' })
    if (userHasPermission(u, role)) return next()
    return res.status(403).json({ error: 'Forbidden' })
  }
}

export function userHasPermission(user, permission) {
  if (!user) return false
  const roles = Array.isArray(user.roles) ? user.roles : []
  if (roles.includes('admin')) return true
  if (!permission) return false
  const perms = Array.isArray(user.permissions) ? user.permissions : []
  return perms.includes(permission)
}

export function requirePermission(permission) {
  return function (req, res, next) {
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (userHasPermission(user, permission)) {
      return next()
    }
    return res.status(403).json({ error: 'Forbidden' })
  }
}
