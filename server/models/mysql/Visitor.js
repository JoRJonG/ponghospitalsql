// Visitor model for tracking website visitors with retention-aware aggregations
import crypto from 'crypto'
import { query, exec, transaction } from '../../database.js'

const DEFAULT_RETENTION_DAYS = 90
const DEFAULT_STATS_RANGE_DAYS = 30
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok'
const MAX_USER_AGENT_LENGTH = 255
const MAX_PATH_LENGTH = 255
const SESSION_SCHEMA_REFRESH_MS = {
  missing: 5 * 60 * 1000,
  present: 60 * 60 * 1000,
}
const SESSION_SCHEMA_DEFAULT = {
  checked: false,
  hasIpColumn: false,
  lastChecked: 0,
  lastError: null,
}
const DEFAULT_RECENT_SESSION_LIMIT = 50
const RECENT_SESSION_LIMIT = (() => {
  const raw = Number.parseInt(process.env.VISITOR_RECENT_SESSION_LIMIT || '', 10)
  if (Number.isFinite(raw) && raw > 0 && raw <= 500) {
    return raw
  }
  return DEFAULT_RECENT_SESSION_LIMIT
})()

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
})

function toDateKey(date = new Date()) {
  return dateFormatter.format(date)
}

function startKeyForRange(days) {
  const safeDays = Math.max(1, Math.floor(days))
  if (safeDays <= 1) {
    return toDateKey()
  }
  const now = new Date()
  const start = new Date(now.getTime())
  start.setUTCDate(start.getUTCDate() - (safeDays - 1))
  return toDateKey(start)
}

function normalizeDistinctIp(expr = 'ip_address') {
  return `COUNT(DISTINCT CASE WHEN ${expr} IS NULL OR ${expr} = '' OR ${expr} = 'unknown' THEN NULL ELSE ${expr} END)`
}

export class Visitor {
  static sessionSchema = { ...SESSION_SCHEMA_DEFAULT }

  static schemaNeedsRefresh(force = false) {
    if (force) return true
    const { checked, hasIpColumn, lastChecked } = this.sessionSchema
    if (!checked) return true
    const ttl = hasIpColumn ? SESSION_SCHEMA_REFRESH_MS.present : SESSION_SCHEMA_REFRESH_MS.missing
    return (Date.now() - (lastChecked || 0)) >= ttl
  }

  static async ensureSessionSchema({ force = false } = {}) {
    if (!this.schemaNeedsRefresh(force)) {
      return this.sessionSchema
    }

    const now = Date.now()

    try {
      const rows = await query("SHOW COLUMNS FROM visitor_sessions LIKE 'ip_address'")
      const hasIpColumn = rows.length > 0
      const prevHadColumn = this.sessionSchema.hasIpColumn
      this.sessionSchema = {
        checked: true,
        hasIpColumn,
        lastChecked: now,
        lastError: null,
      }
      if (hasIpColumn && !prevHadColumn) {
        console.info('[Visitor] Detected ip_address column on visitor_sessions')
      }
    } catch (error) {
      const message = error?.message || 'unknown'
      if (this.sessionSchema.lastError !== message) {
        console.warn('[Visitor] Could not inspect visitor_sessions schema:', message)
      }
      this.sessionSchema = {
        checked: true,
        hasIpColumn: false,
        lastChecked: now,
        lastError: message,
      }
    }

    return this.sessionSchema
  }

  static isMissingIpColumnError(error) {
    const code = error?.code || ''
    if (code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_FIELD' || code === 'ER_NO_DEFAULT_FOR_FIELD') {
      return true
    }
    const message = String(error?.message || '')
    return /unknown column ['"]?ip_address['"]?/i.test(message)
  }

  static normalizeIp(ip) {
    if (!ip) return 'unknown'
    const trimmed = String(ip).trim()
    if (!trimmed) return 'unknown'
    if (trimmed === '::1' || trimmed === '0:0:0:0:0:0:0:1') {
      return '127.0.0.1'
    }
    if (trimmed.startsWith('::ffff:')) {
      return trimmed.substring(7)
    }
    return trimmed
  }

  static normalizeUserAgent(userAgent) {
    return (userAgent || 'unknown').trim()
  }

  static hashValue(value) {
    return crypto.createHash('sha256').update(value || '').digest('hex')
  }

  static generateSessionId() {
    return crypto.randomBytes(16).toString('hex')
  }

  static normalizeSessionId(sessionId) {
    if (!sessionId) return null
    const trimmed = String(sessionId).trim()
    if (!trimmed) return null
    return trimmed.slice(0, 64)
  }

  // Get aggregated visitor count; optionally limit to the last `rangeDays`
  static async getVisitorCount(rangeDays) {
    if (rangeDays && Number.isFinite(rangeDays)) {
      const days = Math.max(1, Math.floor(rangeDays))
      const startKey = startKeyForRange(days)
      const rows = await query(`
        SELECT COALESCE(SUM(visit_count), 0) AS total_visitors
        FROM visitors
        WHERE visit_date >= ?
      `, [startKey])
      return rows[0]?.total_visitors || 0
    }

    const rows = await query(`
      SELECT COALESCE(SUM(visit_count), 0) AS total_visitors
      FROM visitors
    `)
    return rows[0]?.total_visitors || 0
  }

  // Get visitor count for today
  static async getTodayVisitorCount() {
    const todayKey = toDateKey()
    const rows = await query(`
      SELECT visit_count
      FROM visitors
      WHERE visit_date = ?
      LIMIT 1
    `, [todayKey])

    return rows[0]?.visit_count || 0
  }

  static async getTodayPageViews() {
    const todayKey = toDateKey()
    const rows = await query(`
      SELECT COALESCE(SUM(hit_count), 0) AS total_hits
      FROM visitor_sessions
      WHERE visit_date = ?
    `, [todayKey])
    return rows[0]?.total_hits || 0
  }

  // Get daily trend within the specified window
  static async getDailyVisitors(rangeDays = DEFAULT_STATS_RANGE_DAYS) {
    const days = Math.max(1, Math.floor(rangeDays))
    const startKey = startKeyForRange(days)
    const rows = await query(`
      SELECT visit_date AS date, visit_count AS count
      FROM visitors
      WHERE visit_date >= ?
      ORDER BY visit_date ASC
    `, [startKey])
    return rows.map(row => ({
      date: row.date,
      count: Number(row.count) || 0
    }))
  }

  // Record a visitor session and ensure unique daily counts
  static async recordVisit({ sessionId, ip, userAgent, path }) {
    let schema = await this.ensureSessionSchema()
    const normalizedIp = this.normalizeIp(ip)
    const normalizedAgent = this.normalizeUserAgent(userAgent)
    const safePath = (path || '/').slice(0, MAX_PATH_LENGTH)
    const resolvedSessionId = this.normalizeSessionId(sessionId) || this.generateSessionId()
    const ipHash = this.hashValue(normalizedIp.toLowerCase())
    const dateKey = toDateKey()
    const truncatedAgent = normalizedAgent.slice(0, MAX_USER_AGENT_LENGTH)
    const ipForStorage = normalizedIp === 'unknown' ? null : normalizedIp

    if (!schema.hasIpColumn && ipForStorage) {
      schema = await this.ensureSessionSchema({ force: true })
    }

    const includeIpColumn = schema.hasIpColumn && Boolean(ipForStorage)

    const attemptRecord = async (conn, useIpColumn) => {
      let sessionResult
      if (useIpColumn) {
        ;[sessionResult] = await conn.execute(
          `INSERT INTO visitor_sessions (
              visit_date,
              fingerprint,
              ip_hash,
              ip_address,
              user_agent,
              path,
              hit_count,
              first_seen,
              last_seen
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              last_seen = NOW(),
              user_agent = VALUES(user_agent),
              ip_address = VALUES(ip_address),
              path = VALUES(path),
              hit_count = hit_count + 1
          `,
          [dateKey, resolvedSessionId, ipHash, ipForStorage, truncatedAgent || null, safePath]
        )
      } else {
        ;[sessionResult] = await conn.execute(
          `INSERT INTO visitor_sessions (
              visit_date,
              fingerprint,
              ip_hash,
              user_agent,
              path,
              hit_count,
              first_seen,
              last_seen
            )
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              last_seen = NOW(),
              user_agent = VALUES(user_agent),
              path = VALUES(path),
              hit_count = hit_count + 1
          `,
          [dateKey, resolvedSessionId, ipHash, truncatedAgent || null, safePath]
        )
      }

      const isNewSession = sessionResult.affectedRows === 1

      if (isNewSession) {
        console.log(`[VisitorCount] New session: ${resolvedSessionId}, incrementing visit_count`)
        await conn.execute(
          `INSERT INTO visitors (visit_date, visit_count)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE visit_count = visit_count + 1`,
          [dateKey]
        )
      } else {
        console.log(`[VisitorCount] Existing session: ${resolvedSessionId}, ignoring refresh for visit_count`)
      }

      return {
        counted: isNewSession,
        sessionId: resolvedSessionId,
      }
    }

    try {
      const result = await transaction(async (conn) => attemptRecord(conn, includeIpColumn))
      return result
    } catch (error) {
      if (includeIpColumn && this.isMissingIpColumnError(error)) {
        await this.ensureSessionSchema({ force: true })
        const fallbackResult = await transaction(async (conn) => attemptRecord(conn, false))
        return fallbackResult
      }
      throw error
    }
  }

  // Remove entries older than the configured retention window
  static async cleanupOldVisits(retentionDays = DEFAULT_RETENTION_DAYS) {
    const days = Math.max(1, Math.floor(retentionDays))
    await exec(`
      DELETE FROM visitor_sessions
      WHERE visit_date < DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    `)
    await exec(`
      DELETE FROM visitors
      WHERE visit_date < DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    `)
  }

  // Get visitor statistics for dashboard display
  static async getVisitorStats(rangeDays = DEFAULT_STATS_RANGE_DAYS) {
    const [total, todayUnique, todayPageViews, trend] = await Promise.all([
      this.getVisitorCount(rangeDays),
      this.getTodayVisitorCount(),
      this.getTodayPageViews(),
      this.getDailyVisitors(rangeDays)
    ])

    const average = trend.length ? Math.round(total / trend.length) : total

    return {
      total,
      today: todayUnique,
      todayUnique,
      todayPageViews,
      average,
      rangeDays,
      trend
    }
  }

  static async getVisitorInsights(rangeDays = DEFAULT_STATS_RANGE_DAYS) {
    const days = Math.max(1, Math.floor(rangeDays))
    const startKey = startKeyForRange(days)
    const todayKey = toDateKey()
    const { hasIpColumn } = await this.ensureSessionSchema()
    const ipExpr = hasIpColumn ? 'ip_address' : 'ip_hash'

    const [todayRow] = await query(`
      SELECT
        COUNT(*) AS uniqueVisitors,
        COALESCE(SUM(hit_count), 0) AS totalHits,
        ${normalizeDistinctIp(ipExpr)} AS distinctIps
      FROM visitor_sessions
      WHERE visit_date = ?
    `, [todayKey])

    const [rangeRow] = await query(`
      SELECT
        COUNT(*) AS uniqueVisitors,
        COALESCE(SUM(hit_count), 0) AS totalHits,
        ${normalizeDistinctIp(ipExpr)} AS distinctIps
      FROM visitor_sessions
      WHERE visit_date >= ?
    `, [startKey])

    const [lifetimeRow] = await query(`
      SELECT
        COUNT(*) AS uniqueVisitors,
        COALESCE(SUM(hit_count), 0) AS totalHits,
        ${normalizeDistinctIp(ipExpr)} AS distinctIps
      FROM visitor_sessions
    `)

    const trendRows = await query(`
      SELECT visit_date AS date, visit_count AS uniqueVisitors
      FROM visitors
      WHERE visit_date >= ?
      ORDER BY visit_date ASC
    `, [startKey])

    const topPaths = await query(`
      SELECT
        COALESCE(NULLIF(path, ''), '/') AS path,
        COALESCE(SUM(hit_count), 0) AS hits
      FROM visitor_sessions
      WHERE visit_date >= ?
      GROUP BY COALESCE(NULLIF(path, ''), '/')
      ORDER BY hits DESC
      LIMIT 5
    `, [startKey])

    const topAgents = await query(`
      SELECT
        COALESCE(NULLIF(user_agent, ''), 'unknown') AS userAgent,
        COALESCE(SUM(hit_count), 0) AS hits
      FROM visitor_sessions
      WHERE visit_date >= ?
      GROUP BY COALESCE(NULLIF(user_agent, ''), 'unknown')
      ORDER BY hits DESC
      LIMIT 5
    `, [startKey])

    const recentSessions = await query(`
      SELECT
        visit_date,
        ${hasIpColumn ? 'ip_address' : 'NULL'} AS ip_address,
        user_agent,
        path,
        hit_count,
        last_seen
      FROM visitor_sessions
      ORDER BY last_seen DESC
      LIMIT ${RECENT_SESSION_LIMIT}
    `)

    return {
      rangeDays: days,
      today: {
        uniqueVisitors: Number(todayRow?.uniqueVisitors ?? 0),
        hits: Number(todayRow?.totalHits ?? 0),
        distinctIps: Number(todayRow?.distinctIps ?? 0),
      },
      range: {
        uniqueVisitors: Number(rangeRow?.uniqueVisitors ?? 0),
        hits: Number(rangeRow?.totalHits ?? 0),
        distinctIps: Number(rangeRow?.distinctIps ?? 0),
      },
      lifetime: {
        uniqueVisitors: Number(lifetimeRow?.uniqueVisitors ?? 0),
        hits: Number(lifetimeRow?.totalHits ?? 0),
        distinctIps: Number(lifetimeRow?.distinctIps ?? 0),
      },
      trend: trendRows.map(row => ({
        date: row.date,
        uniqueVisitors: Number(row.uniqueVisitors ?? 0),
      })),
      topPaths: topPaths.map(row => ({
        path: row.path || '/',
        hits: Number(row.hits ?? 0),
      })),
      topAgents: topAgents.map(row => ({
        userAgent: row.userAgent || 'unknown',
        hits: Number(row.hits ?? 0),
      })),
      recentSessions: recentSessions.map(row => ({
        visitDate: row.visit_date,
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || null,
        path: row.path || '/',
        hits: Number(row.hit_count ?? 0),
        lastSeen: row.last_seen,
      })),
    }
  }
}
