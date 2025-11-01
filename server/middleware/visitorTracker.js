// Middleware to track website visitors with bot filtering and unique session handling
import { Visitor } from '../models/mysql/Visitor.js'
import { isBotUserAgent } from '../utils/botDetector.js'

const VISITOR_COOKIE = 'visited_today'

function shouldTrackRequest(req) {
  return req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    !req.path.includes('.') &&
    !req.path.startsWith('/admin')
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) {
    return forwarded[0]
  }
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const [first] = forwarded.split(',')
    return first.trim()
  }
  return req.ip || req.connection?.remoteAddress || ''
}

function isSecureRequest(req) {
  if (req.secure) return true
  const proto = req.headers['x-forwarded-proto']
  if (!proto) return false
  if (Array.isArray(proto)) {
    return proto[0]?.toLowerCase() === 'https'
  }
  return String(proto).split(',')[0].trim().toLowerCase() === 'https'
}

function cookieExpiryAtMidnight() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}

export async function trackVisitors(req, res, next) {
  try {
    if (!shouldTrackRequest(req)) {
      return next()
    }

    const userAgent = req.get('user-agent') || ''
    if (isBotUserAgent(userAgent)) {
      return next()
    }

    const clientIp = getClientIp(req)
    const fingerprint = Visitor.createDailyFingerprint(clientIp, userAgent)
    const existingToken = req.cookies?.[VISITOR_COOKIE]

    if (existingToken === fingerprint) {
      return next()
    }

    await Visitor.recordVisit({
      ip: clientIp,
      userAgent,
      path: req.path,
      fingerprint,
    })

    res.cookie(VISITOR_COOKIE, fingerprint, {
      expires: cookieExpiryAtMidnight(),
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: 'lax',
    })
  } catch (error) {
    console.error('Error tracking visitor:', error)
  }

  next()
}