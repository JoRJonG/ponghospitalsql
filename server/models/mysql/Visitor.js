// Visitor model for tracking website visitors with retention-aware aggregations
import crypto from 'crypto'
import { query, exec, transaction } from '../../database.js'

const DEFAULT_RETENTION_DAYS = 90
const DEFAULT_STATS_RANGE_DAYS = 30
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok'
const MAX_USER_AGENT_LENGTH = 255
const MAX_PATH_LENGTH = 255

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
})

function toDateKey(date = new Date()) {
  return dateFormatter.format(date)
}

export class Visitor {
  static normalizeIp(ip) {
    if (!ip) return 'unknown'
    const trimmed = String(ip).trim()
    if (!trimmed) return 'unknown'
    return trimmed.startsWith('::ffff:') ? trimmed.substring(7) : trimmed
  }

  static normalizeUserAgent(userAgent) {
    return (userAgent || 'unknown').trim()
  }

  static hashValue(value) {
    return crypto.createHash('sha256').update(value || '').digest('hex')
  }

  static createDailyFingerprint(ip, userAgent, date = new Date()) {
    const dateKey = toDateKey(date)
    const normalizedIp = this.normalizeIp(ip).toLowerCase()
    const normalizedAgent = this.normalizeUserAgent(userAgent).toLowerCase()
    return crypto.createHash('sha256')
      .update(dateKey)
      .update('|')
      .update(normalizedIp)
      .update('|')
      .update(normalizedAgent)
      .digest('hex')
  }

  // Get aggregated visitor count; optionally limit to the last `rangeDays`
  static async getVisitorCount(rangeDays) {
    if (rangeDays && Number.isFinite(rangeDays)) {
      const days = Math.max(1, Math.floor(rangeDays))
      const rows = await query(`
        SELECT COALESCE(SUM(visit_count), 0) AS total_visitors
        FROM visitors
        WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)
      `)
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
    const rows = await query(`
      SELECT visit_count
      FROM visitors
      WHERE visit_date = CURDATE()
      LIMIT 1
    `)

    return rows[0]?.visit_count || 0
  }

  // Get daily trend within the specified window
  static async getDailyVisitors(rangeDays = DEFAULT_STATS_RANGE_DAYS) {
    const days = Math.max(1, Math.floor(rangeDays))
    const rows = await query(`
      SELECT visit_date AS date, visit_count AS count
      FROM visitors
      WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)
      ORDER BY visit_date ASC
    `)
    return rows.map(row => ({
      date: row.date,
      count: Number(row.count) || 0
    }))
  }

  // Record a visitor session and ensure unique daily counts
  static async recordVisit({ ip, userAgent, path, fingerprint }) {
    const normalizedIp = this.normalizeIp(ip)
    const normalizedAgent = this.normalizeUserAgent(userAgent)
    const safePath = (path || '/').slice(0, MAX_PATH_LENGTH)
    const dailyFingerprint = fingerprint || this.createDailyFingerprint(normalizedIp, normalizedAgent)
    const ipHash = this.hashValue(normalizedIp.toLowerCase())
    const dateKey = toDateKey()
    const truncatedAgent = normalizedAgent.slice(0, MAX_USER_AGENT_LENGTH)

    const result = await transaction(async (conn) => {
      const [sessionResult] = await conn.execute(
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
            hit_count = hit_count + 1,
            last_seen = NOW(),
            user_agent = VALUES(user_agent),
            path = VALUES(path)
        `,
        [dateKey, dailyFingerprint, ipHash, truncatedAgent || null, safePath]
      )

      const isNewSession = sessionResult.affectedRows === 1

      if (isNewSession) {
        await conn.execute(
          `INSERT INTO visitors (visit_date, visit_count)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE visit_count = visit_count + 1`,
          [dateKey]
        )
      }

      return {
        counted: isNewSession,
        fingerprint: dailyFingerprint,
      }
    })

    return result
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
    const [total, today, trend] = await Promise.all([
      this.getVisitorCount(rangeDays),
      this.getTodayVisitorCount(),
      this.getDailyVisitors(rangeDays)
    ])

    const average = trend.length ? Math.round(total / trend.length) : total

    return {
      total,
      today,
      average,
      rangeDays,
      trend
    }
  }
}
