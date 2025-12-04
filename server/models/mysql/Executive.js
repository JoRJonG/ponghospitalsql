// Executive model with BLOB storage for images
import { pool, query, exec, transaction } from '../../database.js'

export class Executive {
  static async findAll(publishedOnly = false) {
    const whereClause = publishedOnly ? 'WHERE is_published = 1' : ''
    const rows = await query(`
      SELECT id as _id, name, position, file_name, mime_type, file_size, 
             display_order, is_published, created_at, updated_at
      FROM executives 
      ${whereClause}
      ORDER BY display_order ASC, id ASC
    `)
    
    return rows.map(row => ({
      _id: row._id,
      name: row.name,
      position: row.position,
      imageUrl: row.file_name ? `/api/images/executives/${row._id}` : null,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      displayOrder: row.display_order,
      isPublished: row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  static async findById(id) {
    const rows = await query(`
      SELECT id as _id, name, position, file_name, mime_type, file_size, 
             display_order, is_published, created_at, updated_at
      FROM executives WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const row = rows[0]
    return {
      _id: row._id,
      name: row.name,
      position: row.position,
      imageUrl: row.file_name ? `/api/images/executives/${row._id}` : null,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      displayOrder: row.display_order,
      isPublished: row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  static async getImageData(id) {
    const rows = await query(`
      SELECT image_data, mime_type, file_name
      FROM executives WHERE id = ?
    `, [id])
    return rows[0] || null
  }

  static async create(data) {
    return await transaction(async (connection) => {
      // หาค่า display_order สูงสุด
      const [maxOrder] = await connection.query('SELECT COALESCE(MAX(display_order), -1) as max_order FROM executives')
      const nextOrder = maxOrder[0].max_order + 1

      const [result] = await connection.execute(`
        INSERT INTO executives (name, position, image_data, file_name, mime_type, file_size, display_order, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.name,
        data.position,
        data.imageData || null,
        data.fileName || null,
        data.mimeType || null,
        data.fileSize || null,
        data.displayOrder !== undefined ? data.displayOrder : nextOrder,
        data.isPublished !== undefined ? (data.isPublished ? 1 : 0) : 1
      ])

      return await this.findById(result.insertId)
    })
  }

  static async updateById(id, data) {
    return await transaction(async (connection) => {
      const updateFields = []
      const updateParams = []
      
      if (data.name !== undefined) {
        updateFields.push('name = ?')
        updateParams.push(data.name)
      }
      if (data.position !== undefined) {
        updateFields.push('position = ?')
        updateParams.push(data.position)
      }
      if (data.displayOrder !== undefined) {
        updateFields.push('display_order = ?')
        updateParams.push(data.displayOrder)
      }
      if (data.isPublished !== undefined) {
        updateFields.push('is_published = ?')
        updateParams.push(data.isPublished ? 1 : 0)
      }
      
      // อัพเดทรูปถ้ามี
      if (data.imageData !== undefined) {
        updateFields.push('image_data = ?', 'file_name = ?', 'mime_type = ?', 'file_size = ?')
        updateParams.push(
          data.imageData,
          data.fileName || null,
          data.mimeType || null,
          data.fileSize || null
        )
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        updateParams.push(id)
        
        await connection.execute(`
          UPDATE executives SET ${updateFields.join(', ')} WHERE id = ?
        `, updateParams)
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    const item = await this.findById(id)
    if (!item) return null
    
    await exec('DELETE FROM executives WHERE id = ?', [id])
    return item
  }

  // Update display orders for multiple executives at once
  static async updateDisplayOrders(orderMap) {
    return await transaction(async (connection) => {
      for (const [id, order] of Object.entries(orderMap)) {
        await connection.execute(
          'UPDATE executives SET display_order = ? WHERE id = ?',
          [order, id]
        )
      }
      return true
    })
  }
}

export default Executive
