import { query } from '../../database.js'

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return fallback }
  }
  if (value && typeof value === 'object') return value
  return fallback
}

function mapUserRow(row) {
  if (!row) return null
  const roles = parseJsonField(row.roles, ['admin'])
  const permissions = parseJsonField(row.permissions, [])
  const isActive = typeof row.is_active === 'number' ? row.is_active !== 0 : row.is_active !== false
  return {
    _id: row._id ?? row.id,
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    roles,
    permissions,
    isActive,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class User {
  static async findOne(filter = {}) {
    let whereClause = 'WHERE 1=1'
    const params = []

    if (filter.username) {
      whereClause += ' AND username = ?'
      params.push(filter.username)
    }

    const rows = await query(
      `SELECT id as _id, id, username, password_hash, roles, permissions, is_active, created_at, updated_at FROM users ${whereClause} LIMIT 1`,
      params
    )

    return mapUserRow(rows[0])
  }

  static async findByUsername(username) {
    return this.findOne({ username })
  }

  static async findById(id) {
    const rows = await query(
      'SELECT id as _id, id, username, password_hash, roles, permissions, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    )
    return mapUserRow(rows[0])
  }

  static async create({ username, passwordHash, roles = ['admin'], permissions = [], isActive = true }) {
    const result = await query(
      'INSERT INTO users (username, password_hash, roles, permissions, is_active) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, JSON.stringify(roles), JSON.stringify(permissions), isActive ? 1 : 0]
    )
    return this.findById(result.insertId)
  }

  static async updateOne(filter, update, options = {}) {
    const { username } = filter
    const { $set } = update
    const { upsert = false } = options

    const existing = username ? await this.findByUsername(username) : null

    if (existing) {
      const passwordHash = $set.passwordHash ?? existing.passwordHash
      const roles = $set.roles ?? existing.roles ?? ['admin']
      const permissions = $set.permissions ?? existing.permissions ?? []
      const isActive = typeof $set.isActive === 'boolean' ? $set.isActive : existing.isActive !== false
      const result = await query(
        'UPDATE users SET password_hash = ?, roles = ?, permissions = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [passwordHash, JSON.stringify(roles), JSON.stringify(permissions), isActive ? 1 : 0, username]
      )
      return { modifiedCount: result.affectedRows, upsertedCount: 0 }
    }

    if (upsert) {
      const newUsername = $set.username ?? username
      if (!newUsername) throw new Error('Username is required for upsert')
      const passwordHash = $set.passwordHash
      if (!passwordHash) throw new Error('passwordHash is required for upsert')
      await this.create({
        username: newUsername,
        passwordHash,
        roles: $set.roles ?? ['admin'],
        permissions: $set.permissions ?? [],
        isActive: typeof $set.isActive === 'boolean' ? $set.isActive : true,
      })
      return { modifiedCount: 0, upsertedCount: 1 }
    }

    return { modifiedCount: 0, upsertedCount: 0 }
  }

  static async countDocuments(filter = {}) {
    const rows = await query('SELECT COUNT(*) as count FROM users')
    return rows[0].count
  }

  static async findAll(limit = 50, offset = 0) {
    const rows = await query(
      'SELECT id as _id, id, username, roles, permissions, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
    return rows.map(mapUserRow)
  }

  static async updateById(id, { passwordHash, roles, permissions, isActive }) {
    const existing = await this.findById(id)
    if (!existing) return null
    const nextPassword = passwordHash ?? existing.passwordHash
    const nextRoles = roles ?? existing.roles ?? ['admin']
    const nextPermissions = permissions ?? existing.permissions ?? []
    const nextActive = typeof isActive === 'boolean' ? isActive : existing.isActive !== false
    await query(
      'UPDATE users SET password_hash = ?, roles = ?, permissions = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextPassword, JSON.stringify(nextRoles), JSON.stringify(nextPermissions), nextActive ? 1 : 0, id]
    )
    return this.findById(id)
  }

  static async deleteById(id) {
    const result = await query('DELETE FROM users WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}

export default User