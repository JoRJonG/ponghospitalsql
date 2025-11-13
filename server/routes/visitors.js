// Routes for visitor tracking
import express from 'express'
import { Visitor } from '../models/mysql/Visitor.js'
import { optionalAuth } from '../middleware/auth.js'
import { SESSION_TIMEOUT_MS, getClientIp, isTrackedPath, resolveVisitorSession, setVisitorCookie } from '../middleware/visitorTracker.js'
import { isBotUserAgent } from '../utils/botDetector.js'

const router = express.Router()

const MAX_PATH_LENGTH = 255

function resolveTrackedPath(req) {
  const bodyPath = typeof req.body?.path === 'string' ? req.body.path : null
  const queryPath = typeof req.query?.path === 'string' ? req.query.path : null
  const headerPath = typeof req.headers['x-tracked-path'] === 'string' ? req.headers['x-tracked-path'] : null
  const candidate = bodyPath || queryPath || headerPath
  if (candidate && candidate.trim().length > 0) {
    return candidate.trim().slice(0, MAX_PATH_LENGTH)
  }
  const referer = req.get('referer')
  if (typeof referer === 'string' && referer.startsWith('http')) {
    try {
      const url = new URL(referer)
      const path = `${url.pathname || '/'}` + (url.search || '')
      if (path.trim().length > 0) {
        return path.slice(0, MAX_PATH_LENGTH)
      }
    } catch {}
  }
  return req.path || '/'
}

router.post('/track', optionalAuth, async (req, res) => {
  try {
    const userAgent = req.get('user-agent') || ''
    if (isBotUserAgent(userAgent)) {
      return res.json({ success: true, data: { counted: false, reason: 'bot' } })
    }

    // Skip tracking for admin users
    if (req.user && req.user.roles && req.user.roles.includes('admin')) {
      return res.json({ success: true, data: { counted: false, reason: 'admin' } })
    }

    const path = resolveTrackedPath(req)
    if (!isTrackedPath(path)) {
      return res.json({ success: true, data: { counted: false, reason: 'ignored-path' } })
    }

    const ip = getClientIp(req)
    const now = Date.now()
    const session = resolveVisitorSession(req, now)

    const result = await Visitor.recordVisit({
      sessionId: session.sessionId,
      ip,
      userAgent,
      path,
      isNewSession: session.isNew,
    })

    const nextSessionId = result?.sessionId || session.sessionId
    const updatedLastSeen = result?.merged ? now : session.lastSeen
    setVisitorCookie(res, req, { sessionId: nextSessionId, lastSeen: updatedLastSeen })

    let reason = 'existing-session'
    if (result?.counted) {
      reason = 'new-session'
    } else if (result?.merged) {
      reason = 'merged-session'
    }

    return res.json({
      success: true,
      data: {
        counted: Boolean(result?.counted),
        merged: Boolean(result?.merged),
        sessionId: nextSessionId,
        sessionTimeoutMs: SESSION_TIMEOUT_MS,
        reason,
      }
    })
  } catch (error) {
    console.error('Error recording visitor from API:', error)
    return res.status(500).json({ success: false, error: 'Failed to record visit' })
  }
})

// Helper to clamp the requested range
function parseRangeDays(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(365, Math.max(1, parsed))
}

// Get visitor statistics for dashboards (includes total, today, average, trend)
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const stats = await Visitor.getVisitorStats(rangeDays)
    const lifetimeTotal = await Visitor.getVisitorCount()

    res.json({
      success: true,
      data: {
        ...stats,
        lifetimeTotal
      }
    })
  } catch (error) {
    console.error('Error fetching visitor stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor statistics'
    })
  }
})

// Lightweight endpoint for widgets that only need a count within a range (defaults to retention window)
router.get('/count', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const count = await Visitor.getVisitorCount(rangeDays)
    res.json({
      success: true,
      data: {
        count,
        rangeDays: rangeDays ?? null
      }
    })
  } catch (error) {
    console.error('Error fetching visitor count:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor count'
    })
  }
})

// Expose raw trend data (e.g. for admin charts)
router.get('/trend', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const trend = await Visitor.getDailyVisitors(rangeDays)
    res.json({
      success: true,
      data: {
        rangeDays: rangeDays ?? null,
        trend
      }
    })
  } catch (error) {
    console.error('Error fetching visitor trend:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor trend'
    })
  }
})

router.get('/insights', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, 30)
    const insights = await Visitor.getVisitorInsights(rangeDays)
    res.json({
      success: true,
      data: insights,
    })
  } catch (error) {
    console.error('Error fetching visitor insights:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor insights'
    })
  }
})

export default router
