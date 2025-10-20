import { pool, query, transaction } from '../../database.js'

export class User {
  static async findOne(filter = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.username) {
      whereClause += ' AND username = ?'
      params.push(filter.username)
    }
    
    const rows = await query(
      `SELECT id as _id, username, password_hash as passwordHash, roles, created_at, updated_at FROM users ${whereClause} LIMIT 1`,
      params
    )
    
    if (!rows[0]) return null
    
    const user = rows[0]
    // Parse roles if it's a string
    if (typeof user.roles === 'string') {
      user.roles = JSON.parse(user.roles)
    }
    // แปลง snake_case เป็น camelCase
    user.createdAt = user.created_at
    user.updatedAt = user.updated_at
    delete user.created_at
    delete user.updated_at
    return user
  }

  static async findByUsername(username) {
    return this.findOne({ username })
  }

  static async create({ username, passwordHash, roles = ['admin'] }) {
    const result = await query(
      'INSERT INTO users (username, password_hash, roles) VALUES (?, ?, ?)',
      [username, passwordHash, JSON.stringify(roles)]
    )
    return { id: result.insertId, username, roles }
  }

  static async updateOne(filter, update, options = {}) {
    const { username } = filter
    const { $set } = update
    const { upsert = false } = options

    if (upsert) {
      // ลองอัพเดทก่อน
      const existing = await this.findByUsername(username)
      if (existing) {
        await query(
          'UPDATE users SET password_hash = ?, roles = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
          [$set.passwordHash, JSON.stringify($set.roles), username]
        )
        return { modifiedCount: 1, upsertedCount: 0 }
      } else {
        // สร้างใหม่
        await this.create({ 
          username: $set.username, 
          passwordHash: $set.passwordHash, 
          roles: $set.roles 
        })
        return { modifiedCount: 0, upsertedCount: 1 }
      }
    } else {
      const result = await query(
        'UPDATE users SET password_hash = ?, roles = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [$set.passwordHash, JSON.stringify($set.roles), username]
      )
      return { modifiedCount: result.affectedRows, upsertedCount: 0 }
    }
  }

  static async countDocuments(filter = {}) {
    const rows = await query('SELECT COUNT(*) as count FROM users')
    return rows[0].count
  }

  static async findAll(limit = 50, offset = 0) {
    const rows = await query(
      'SELECT id as _id, username, roles, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
    return rows.map(row => ({
      _id: row._id,
      username: row.username,
      roles: JSON.parse(row.roles || '["admin"]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
}

export default User