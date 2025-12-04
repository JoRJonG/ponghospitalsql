// Utility helpers for consistent local date/time formatting and parsing
export function pad(n) {
  return String(n).padStart(2, '0')
}

// Format a Date (local time) into MySQL DATETIME 'YYYY-MM-DD HH:mm:ss'
export function toLocalSql(d) {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// Parse various inputs and return MySQL local DATETIME string
// Accepts: Date, 'YYYY-MM-DD HH:mm[:ss]', 'YYYY-MM-DDTHH:mm[:ss]', ISO strings with timezone
export function parseToLocalSql(value) {
  if (!value) return null
  if (value instanceof Date) return toLocalSql(value)
  const s = String(value).trim()
  if (!s) return null

  // Match SQL/HTML local formats first
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const day = Number(m[3])
    const hour = Number(m[4])
    const minute = Number(m[5])
    const second = Number(m[6] || 0)
    const d = new Date(year, month, day, hour, minute, second, 0)
    if (Number.isNaN(d.getTime())) return null
    return toLocalSql(d)
  }

  // Fallback: rely on Date parsing (handles ISO with timezone)
  const parsed = new Date(s)
  if (Number.isNaN(parsed.getTime())) return null
  return toLocalSql(parsed)
}

// Return a string suitable for HTML <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
export function toDateTimeLocal(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default {
  pad,
  toLocalSql,
  parseToLocalSql,
  toDateTimeLocal
}
