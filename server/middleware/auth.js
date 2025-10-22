import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-devsecret-change-me'

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
  if (jwtToken) { try { req.user = jwt.verify(jwtToken, JWT_SECRET) } catch {} }
  next()
}

export function requireRole(role) {
  return function(req, res, next) {
    const u = req.user
    if (!u) return res.status(401).json({ error: 'Unauthorized' })
    const roles = Array.isArray(u?.roles) ? u.roles : []
    if (roles.includes(role) || roles.includes('admin')) return next()
    return res.status(403).json({ error: 'Forbidden' })
  }
}
