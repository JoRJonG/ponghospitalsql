// Middleware to track website visitors with bot filtering and unique session handling
import { Visitor } from '../models/mysql/Visitor.js'
import { isBotUserAgent } from '../utils/botDetector.js'

const VISITOR_COOKIE = 'visited_today'
const TRACKED_PATH_PREFIXES = [
  '/',
  '/activities',
  '/management',
  '/executives',
  '/ita',
  '/about',
  '/contact',
  '/login',
]

function normalizePath(value) {
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}

export function isTrackedPath(path) {
  const normalized = normalizePath(path)
  if (normalized === '/') return true
  return TRACKED_PATH_PREFIXES.some(prefix => (
    prefix !== '/' && (normalized === prefix || normalized.startsWith(`${prefix}/`))
  ))
}

function shouldTrackRequest(req) {
  return req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    !req.path.includes('.') &&
    !req.path.startsWith('/admin') &&
    isTrackedPath(req.path)
}

export function getClientIp(req) {
  const priorityHeaders = [
    'cf-connecting-ip',
    'true-client-ip',
    'x-real-ip',
    'x-client-ip',
  ]

  for (const header of priorityHeaders) {
    const value = req.headers[header]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value.find(entry => typeof entry === 'string' && entry.trim().length > 0)
      if (first) return first.trim()
    }
  }

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

    const result = await Visitor.recordVisit({
      ip: clientIp,
      userAgent,
      path: req.path,
      fingerprint,
    })

    if (!result.counted) {
      return next()
    }

    res.cookie(VISITOR_COOKIE, result.fingerprint, {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: 'lax',
    })
  } catch (error) {
    console.error('Error tracking visitor:', error)
  }

  next()
}