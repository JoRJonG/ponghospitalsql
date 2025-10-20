import { pool, query, exec } from '../../database.js'

export class Slide {
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
      SELECT id, title, caption, alt, href, image_url, image_public_id, display_order, is_published, created_at, updated_at
      FROM slides
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    // แปลงรูปแบบให้เหมือน MongoDB
    return rows.map(row => ({
      ...row,
      image: {
        url: row.image_url,
        publicId: row.image_public_id
      },
      order: row.display_order
    }))
  }

  static async findById(id) {
    const rows = await query(`
      SELECT id, title, caption, alt, href, image_url, image_public_id, display_order, is_published, created_at, updated_at
      FROM slides WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const row = rows[0]
    return {
      ...row,
      image: {
        url: row.image_url,
        publicId: row.image_public_id
      },
      order: row.display_order
    }
  }

  static async create(data) {
    const result = await query(`
      INSERT INTO slides (title, caption, alt, href, image_url, image_public_id, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.caption || '',
      data.alt || '',
      data.href || '',
      data.image.url,
      data.image.publicId || null,
      data.order || 0,
      data.isPublished !== undefined ? data.isPublished : true
    ])

    return { id: result.insertId, ...data }
  }

  static async updateById(id, data) {
    const updateFields = []
    const updateParams = []
    
    if (data.title) {
      updateFields.push('title = ?')
      updateParams.push(data.title)
    }
    if (data.caption !== undefined) {
      updateFields.push('caption = ?')
      updateParams.push(data.caption)
    }
    if (data.alt !== undefined) {
      updateFields.push('alt = ?')
      updateParams.push(data.alt)
    }
    if (data.href !== undefined) {
      updateFields.push('href = ?')
      updateParams.push(data.href)
    }
    if (data.image) {
      if (data.image.url) {
        updateFields.push('image_url = ?')
        updateParams.push(data.image.url)
      }
      if (data.image.publicId !== undefined) {
        updateFields.push('image_public_id = ?')
        updateParams.push(data.image.publicId)
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
        UPDATE slides SET ${updateFields.join(', ')} WHERE id = ?
      `, updateParams)
    }

    return await this.findById(id)
  }

  static async deleteById(id) {
    const result = await query('DELETE FROM slides WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  // MongoDB-compatible methods
  static async findByIdAndUpdate(id, data, options = {}) {
    await this.updateById(id, data)
    if (options.new) {
      return await this.findById(id)
    }
    return null
  }

  static async findByIdAndDelete(id) {
    const doc = await this.findById(id)
    if (doc) {
      await this.deleteById(id)
    }
    return doc
  }

  static async bulkWrite(operations) {
    let modifiedCount = 0
    for (const op of operations) {
      if (op.updateOne) {
        const { filter, update } = op.updateOne
        const id = filter._id || filter.id
        const setData = update.$set || update
        if (id && setData.order !== undefined) {
          const result = await exec('UPDATE slides SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [setData.order, id])
          if (result.changes) modifiedCount++
        }
      }
    }
    return { modifiedCount }
  }

  static async countDocuments(filter = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }

    const rows = await query(`SELECT COUNT(*) as count FROM slides ${whereClause}`, params)
    return rows[0].count
  }
}

export default Slide