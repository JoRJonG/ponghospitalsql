// Middleware to track website visitors with bot filtering and unique session handling
import { Visitor } from '../models/mysql/Visitor.js'
import { isBotUserAgent } from '../utils/botDetector.js'

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok'

const VISITOR_COOKIE = 'visited_today'
const TRACKED_PATH_PREFIXES = [
  '/',
  '/announcements',
  '/announcement',
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

function isTrackedPath(path) {
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

function getClientIp(req) {
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

function getDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = Number(part.value)
    }
  }
  const fallback = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  }
  return {
    year: Number.isFinite(map.year) ? map.year : fallback.year,
    month: Number.isFinite(map.month) ? map.month : fallback.month,
    day: Number.isFinite(map.day) ? map.day : fallback.day,
    hour: Number.isFinite(map.hour) ? map.hour : fallback.hour,
    minute: Number.isFinite(map.minute) ? map.minute : fallback.minute,
    second: Number.isFinite(map.second) ? map.second : fallback.second,
  }
}

function cookieExpiryAtMidnight() {
  const now = new Date()
  const { year, month, day, hour, minute, second } = getDateParts(now, APP_TIMEZONE)
  const localNowUtcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  const localMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0)
  const msUntilMidnight = localMidnightUtcMs - localNowUtcMs
  return new Date(now.getTime() + msUntilMidnight)
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