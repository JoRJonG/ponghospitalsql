import { query, exec } from '../../database.js'

const DEFAULT_VALUE = null

export default class SiteSetting {
  static async get(key) {
    if (!key) return DEFAULT_VALUE
    const rows = await query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
      [key]
    )
    if (!rows[0]) return DEFAULT_VALUE
    const value = rows[0].setting_value
    return value
  }

  static async set(key, value, updatedBy = null) {
    if (!key) return
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await exec(
      `INSERT INTO site_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [key, stringValue, updatedBy]
    )
  }

  static async all() {
    const rows = await query('SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key ASC')
    return rows.map(row => ({ key: row.setting_key, value: row.setting_value }))
  }
}
