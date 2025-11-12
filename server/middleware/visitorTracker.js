// Middleware to track website visitors with bot filtering and session handling
import crypto from 'crypto'
import { Visitor } from '../models/mysql/Visitor.js'
import { isBotUserAgent } from '../utils/botDetector.js'

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000
const SESSION_TIMEOUT_MINUTES = Number.parseInt(process.env.VISITOR_SESSION_TIMEOUT_MINUTES || '', 10)
const SESSION_TIMEOUT_MS_ENV = Number.parseInt(process.env.VISITOR_SESSION_TIMEOUT_MS || '', 10)
export const SESSION_TIMEOUT_MS = Number.isFinite(SESSION_TIMEOUT_MS_ENV) && SESSION_TIMEOUT_MS_ENV >= 60_000
  ? SESSION_TIMEOUT_MS_ENV
  : Number.isFinite(SESSION_TIMEOUT_MINUTES) && SESSION_TIMEOUT_MINUTES > 0
    ? SESSION_TIMEOUT_MINUTES * 60_000
    : DEFAULT_SESSION_TIMEOUT_MS

export const SESSION_COOKIE = 'visitor_session'
const SESSION_COOKIE_SEPARATOR = '|'

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

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex')
}

export function parseVisitorSessionCookie(value) {
  if (typeof value !== 'string') return null
  const [rawId, rawTimestamp] = value.split(SESSION_COOKIE_SEPARATOR)
  const sessionId = rawId?.trim()
  if (!sessionId) return null
  const lastSeen = Number.parseInt(rawTimestamp, 10)
  if (!Number.isFinite(lastSeen) || lastSeen <= 0) {
    return null
  }
  return { sessionId, lastSeen }
}

export function resolveVisitorSession(req, now = Date.now()) {
  const parsed = parseVisitorSessionCookie(req.cookies?.[SESSION_COOKIE])
  if (!parsed) {
    console.log('[VisitorSession] New session: missing cookie')
    return {
      sessionId: generateSessionId(),
      lastSeen: now,
      isNew: true,
      reason: 'missing',
    }
  }

  const expired = now - parsed.lastSeen >= SESSION_TIMEOUT_MS
  if (expired) {
    console.log(`[VisitorSession] New session: expired (${Math.round((now - parsed.lastSeen) / 1000 / 60)} min ago)`)
    return {
      sessionId: generateSessionId(),
      lastSeen: now,
      isNew: true,
      reason: 'expired',
      previousSessionId: parsed.sessionId,
    }
  }

  console.log(`[VisitorSession] Existing session: ${parsed.sessionId} (${Math.round((now - parsed.lastSeen) / 1000 / 60)} min ago)`)
  return {
    sessionId: parsed.sessionId,
    lastSeen: parsed.lastSeen,
    isNew: false,
    reason: 'active',
  }
}

function encodeSessionCookie(sessionId, lastSeenMs) {
  return `${sessionId}${SESSION_COOKIE_SEPARATOR}${Math.max(0, Math.floor(lastSeenMs))}`
}

export function setVisitorCookie(res, req, session) {
  const { sessionId, lastSeen } = session
  res.cookie(SESSION_COOKIE, encodeSessionCookie(sessionId, lastSeen ?? Date.now()), {
    maxAge: SESSION_TIMEOUT_MS,
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
  })
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
    const now = Date.now()
    const session = resolveVisitorSession(req, now)

    const result = await Visitor.recordVisit({
      sessionId: session.sessionId,
      ip: clientIp,
      userAgent,
      path: req.path,
      isNewSession: session.isNew,
    })

    if (!result) {
      return next()
    }

    const nextSessionId = result.sessionId || session.sessionId
    setVisitorCookie(res, req, { sessionId: nextSessionId, lastSeen: now })
  } catch (error) {
    console.error('Error tracking visitor:', error)
  }

  next()
}