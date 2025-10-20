import { pool, query } from '../../database.js'

export class Unit {
  static async find(filter = {}, options = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }

    let orderClause = 'ORDER BY display_order ASC, created_at DESC'
    if (options.sort) {
      if (options.sort.order) {
        orderClause = `ORDER BY display_order ${options.sort.order === -1 ? 'DESC' : 'ASC'}`
      }
    }

    let limitClause = ''
    if (options.limit) {
      limitClause = `LIMIT ${options.limit}`
    }

    const rows = await query(`
      SELECT id, name, href, image_url, image_public_id, display_order, is_published, created_at, updated_at
      FROM units
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    // แปลงรูปแบบให้เหมือน MongoDB
    return rows.map(row => ({
      ...row,
      image: row.image_url ? {
        url: row.image_url,
        publicId: row.image_public_id
      } : null,
      order: row.display_order
    }))
  }

  static async findById(id) {
    const rows = await query(`
      SELECT id, name, href, image_url, image_public_id, display_order, is_published, created_at, updated_at
      FROM units WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const row = rows[0]
    return {
      ...row,
      image: row.image_url ? {
        url: row.image_url,
        publicId: row.image_public_id
      } : null,
      order: row.display_order
    }
  }

  static async create(data) {
    const result = await query(`
      INSERT INTO units (name, href, image_url, image_public_id, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.href || '',
      data.image?.url || null,
      data.image?.publicId || null,
      data.order || 0,
      data.isPublished !== undefined ? data.isPublished : true
    ])

    return { id: result.insertId, ...data }
  }

  static async updateById(id, data) {
    const updateFields = []
    const updateParams = []
    
    if (data.name) {
      updateFields.push('name = ?')
      updateParams.push(data.name)
    }
    if (data.href !== undefined) {
      updateFields.push('href = ?')
      updateParams.push(data.href)
    }
    if (data.image !== undefined) {
      if (data.image) {
        updateFields.push('image_url = ?')
        updateParams.push(data.image.url)
        updateFields.push('image_public_id = ?')
        updateParams.push(data.image.publicId || null)
      } else {
        updateFields.push('image_url = NULL')
        updateFields.push('image_public_id = NULL')
      }
    }
    if (data.order !== undefined) {
      updateFields.push('display_order = ?')
      updateParams.push(data.order)
    }
    if (data.isPublished !== undefined) {
      updateFields.push('is_published = ?')
      updateParams.push(data.isPublished)
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP')
      updateParams.push(id)
      
      await query(`
        UPDATE units SET ${updateFields.join(', ')} WHERE id = ?
      `, updateParams)
    }

    return await this.findById(id)
  }

  static async deleteById(id) {
    const result = await query('DELETE FROM units WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  static async countDocuments(filter = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }

    const rows = await query(`SELECT COUNT(*) as count FROM units ${whereClause}`, params)
    return rows[0].count
  }
}

export default Unit