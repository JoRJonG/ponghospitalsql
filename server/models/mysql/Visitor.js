// Visitor model for tracking website visitors with retention-aware aggregations
import { query } from '../../database.js'

const DEFAULT_RETENTION_DAYS = 90
const DEFAULT_STATS_RANGE_DAYS = 30

export class Visitor {
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

  // Increment visitor count for today
  static async incrementVisitorCount() {
    await query(`
      INSERT INTO visitors (visit_date, visit_count)
      VALUES (CURDATE(), 1)
      ON DUPLICATE KEY UPDATE visit_count = visit_count + 1
    `)

    return this.getVisitorCount()
  }

  // Remove entries older than the configured retention window
  static async cleanupOldVisits(retentionDays = DEFAULT_RETENTION_DAYS) {
    const days = Math.max(1, Math.floor(retentionDays))
    await query(`
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
