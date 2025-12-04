import { pool, query, exec } from '../../database.js'

export class Unit {
  static async findById(id) {
    const rows = await query(`
      SELECT id as _id, name, href, file_name, mime_type, file_size, 
             display_order, is_published, created_at, updated_at
      FROM units WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const row = rows[0]
    return {
      _id: row._id,
      name: row.name,
      href: row.href,
      isPublished: row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      image: {
        url: `/api/images/units/${id}`,
        fileName: row.file_name,
        mimeType: row.mime_type,
        size: row.file_size
      },
      order: row.display_order
    }
  }

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
    const limitVal = Number.parseInt(options.limit, 10)
    if (Number.isFinite(limitVal) && limitVal > 0) {
      limitClause = 'LIMIT ?'
      params.push(limitVal)
    }

    const rows = await query(`
      SELECT id as _id, name, href, file_name, mime_type, file_size,
             display_order, is_published, created_at, updated_at
      FROM units
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    return rows.map(row => ({
      _id: row._id,
      name: row.name,
      href: row.href,
      isPublished: row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      image: row.file_name ? {
        url: `/api/images/units/${row._id}`,
        fileName: row.file_name,
        mimeType: row.mime_type,
        size: row.file_size
      } : null,
      order: row.display_order
    }))
  }

  static async getImageData(id) {
    const rows = await query(`
      SELECT image_data, mime_type, file_name
      FROM units WHERE id = ?
    `, [id])
    return rows[0] || null
  }

  static async create(data) {
    const result = await exec(`
      INSERT INTO units (name, href, image_data, file_name, mime_type, file_size, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.href || '',
      data.imageData || null, // Buffer หรือ null
      data.fileName || null,
      data.mimeType || null,
      data.fileSize || 0,
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
    if (data.imageData) {
      updateFields.push('image_data = ?')
      updateParams.push(data.imageData)
      updateFields.push('file_name = ?')
      updateParams.push(data.fileName)
      updateFields.push('mime_type = ?')
      updateParams.push(data.mimeType)
      updateFields.push('file_size = ?')
      updateParams.push(data.fileSize)
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
      
      await exec(`
        UPDATE units SET ${updateFields.join(', ')} WHERE id = ?
      `, updateParams)
    }

    return await this.findById(id)
  }

  static async deleteById(id) {
    const result = await exec('DELETE FROM units WHERE id = ?', [id])
    return result.affectedRows > 0
  }

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
          const result = await exec('UPDATE units SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [setData.order, id])
          if (result.affectedRows) modifiedCount++
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

    const rows = await query(`SELECT COUNT(*) as count FROM units ${whereClause}`, params)
    return rows[0].count
  }
}

export default Unit
