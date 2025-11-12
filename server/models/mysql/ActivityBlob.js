// Activity model with BLOB storage for images
import { pool, query, exec, transaction } from '../../database.js'

// Helper function to format date for MySQL DATETIME
function formatDateForMySQL(date) {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export class Activity {
  static async findById(id) {
    const rows = await query(`
      SELECT id as _id, title, description, date, published_at, is_published, 
             created_by, updated_by, created_at, updated_at, view_count
      FROM activities WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const activity = rows[0]
    
    // ดึงข้อมูลรูปภาพ (ไม่ดึง blob ตรงนี้)
    const images = await query(`
      SELECT id, activity_id, file_name, mime_type, file_size, display_order
      FROM activity_images 
      WHERE activity_id = ? 
      ORDER BY display_order ASC
    `, [id])
    
    return {
      _id: activity._id,
      title: activity.title,
      description: activity.description,
      date: activity.date,
      publishedAt: activity.published_at,
      isPublished: activity.is_published,
      createdBy: activity.created_by,
      updatedBy: activity.updated_by,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      viewCount: activity.view_count,
      images: images.map(img => ({
        _id: img.id,
        url: `/api/images/activities/${id}/${img.id}`,
        fileName: img.file_name,
        mimeType: img.mime_type,
        size: img.file_size
      }))
    }
  }

  static async incrementViewCount(id) {
    await query(`
      UPDATE activities 
      SET view_count = view_count + 1 
      WHERE id = ?
    `, [id])
  }

  static async find(filter = {}, options = {}) {
    const self = this
    const thenFn = async function(resolve, reject) {
      try {
        const result = await self._executeFind(this._filter, this._options, this._sortOptions)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    const findResult = {
      _filter: filter,
      _options: options,
      _sortOptions: null,
      
      sort: function(sortObj) {
        const newObj = {
          _filter: this._filter,
          _options: this._options,
          _sortOptions: sortObj,
          sort: this.sort,
          then: thenFn
        }
        return newObj
      },
      
      then: thenFn
    }
    
    return findResult
  }
  
  static async _executeFind(filter = {}, options = {}, sortOptions = null) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }
    
    if (filter.$or) {
      whereClause += ' AND (published_at IS NULL OR published_at <= NOW())'
    }

    let orderClause = 'ORDER BY published_at DESC'
    if (sortOptions) {
      const orderParts = []
      if (sortOptions.publishedAt) {
        orderParts.push(`published_at ${sortOptions.publishedAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (sortOptions.updatedAt) {
        orderParts.push(`updated_at ${sortOptions.updatedAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (sortOptions.createdAt) {
        orderParts.push(`created_at ${sortOptions.createdAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (sortOptions.date) {
        orderParts.push(`date ${sortOptions.date === -1 ? 'DESC' : 'ASC'}`)
      }
      if (orderParts.length > 0) {
        orderClause = 'ORDER BY ' + orderParts.join(', ')
      }
    } else if (options.sort) {
      if (options.sort.publishedAt) {
        orderClause = `ORDER BY published_at ${options.sort.publishedAt === -1 ? 'DESC' : 'ASC'}`
      } else if (options.sort.date) {
        orderClause = `ORDER BY date ${options.sort.date === -1 ? 'DESC' : 'ASC'}`
      }
    }

    let limitClause = ''
    const limitVal = Number.parseInt(options.limit, 10)
    if (Number.isFinite(limitVal) && limitVal > 0) {
      limitClause = 'LIMIT ?'
      params.push(limitVal)
      const offsetVal = Number.parseInt(options.skip, 10)
      if (Number.isFinite(offsetVal) && offsetVal >= 0) {
        limitClause += ' OFFSET ?'
        params.push(offsetVal)
      }
    }

    const rows = await query(`
      SELECT id as _id, title, description, date, published_at, is_published, 
             created_by, updated_by, created_at, updated_at, view_count
      FROM activities
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    // ดึงรูปภาพสำหรับแต่ละกิจกรรม
    for (const activity of rows) {
      const images = await query(`
        SELECT id, activity_id, file_name, mime_type, file_size, display_order
        FROM activity_images 
        WHERE activity_id = ? 
        ORDER BY display_order ASC
      `, [activity._id])
      
      activity.images = images.map(img => ({
        _id: img.id,
        url: `/api/images/activities/${activity._id}/${img.id}`,
        fileName: img.file_name,
        mimeType: img.mime_type,
        size: img.file_size
      }))
      
      activity.publishedAt = activity.published_at
      activity.isPublished = activity.is_published
      activity.createdBy = activity.created_by
      activity.updatedBy = activity.updated_by
      activity.createdAt = activity.created_at
      activity.updatedAt = activity.updated_at
      activity.viewCount = activity.view_count
      delete activity.published_at
      delete activity.is_published
      delete activity.created_by
      delete activity.updated_by
      delete activity.created_at
      delete activity.updated_at
      delete activity.view_count
    }

    return rows
  }

  static async getImageData(activityId, imageId) {
    const rows = await query(`
      SELECT image_data, mime_type, file_name
      FROM activity_images 
      WHERE id = ? AND activity_id = ?
    `, [imageId, activityId])
    return rows[0] || null
  }

  static async create(data) {
    return await transaction(async (connection) => {
      const [result] = await connection.execute(`
        INSERT INTO activities (title, description, date, published_at, is_published, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.title,
        data.description || '',
        formatDateForMySQL(data.date) || new Date(),
        formatDateForMySQL(data.publishedAt) || new Date(),
        (data.isPublished !== undefined ? data.isPublished : true) ? 1 : 0,
        data.createdBy || null,
        data.updatedBy || null
      ])

      const activityId = result.insertId

      // เพิ่มรูปภาพแบบ BLOB
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const image = data.images[i]
          if (image.imageData) {
            // บันทึกเป็น BLOB
            await connection.execute(`
              INSERT INTO activity_images (activity_id, image_data, file_name, mime_type, file_size, display_order)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              activityId,
              image.imageData,
              image.fileName || 'image.jpg',
              image.mimeType || 'image/jpeg',
              image.fileSize || 0,
              i
            ])
          }
        }
      }

      return { id: activityId, ...data }
    })
  }

  static async updateById(id, data) {
    return await transaction(async (connection) => {
      const updateFields = []
      const updateParams = []
      
      if (data.title) {
        updateFields.push('title = ?')
        updateParams.push(data.title)
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?')
        updateParams.push(data.description)
      }
      if (data.date) {
        updateFields.push('date = ?')
        updateParams.push(formatDateForMySQL(data.date))
      }
      if (data.publishedAt !== undefined) {
        updateFields.push('published_at = ?')
        updateParams.push(formatDateForMySQL(data.publishedAt))
      }
      if (data.isPublished !== undefined) {
        updateFields.push('is_published = ?')
        updateParams.push(data.isPublished ? 1 : 0)
      }
      if (data.updatedBy) {
        updateFields.push('updated_by = ?')
        updateParams.push(data.updatedBy)
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        updateParams.push(id)
        
        await connection.execute(`
          UPDATE activities SET ${updateFields.join(', ')} WHERE id = ?
        `, updateParams)
      }

      // อัพเดทรูปภาพถ้ามี
      if (data.images !== undefined) {
        // ลบรูปเก่าทั้งหมด
        await connection.execute('DELETE FROM activity_images WHERE activity_id = ?', [id])
        
        // เพิ่มรูปใหม่
        if (Array.isArray(data.images) && data.images.length > 0) {
          for (let i = 0; i < data.images.length; i++) {
            const image = data.images[i]
            if (image.imageData) {
              await connection.execute(`
                INSERT INTO activity_images (activity_id, image_data, file_name, mime_type, file_size, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [
                id,
                image.imageData,
                image.fileName || 'image.jpg',
                image.mimeType || 'image/jpeg',
                image.fileSize || 0,
                i
              ])
            }
          }
        }
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    return await transaction(async (connection) => {
      // ลบรูปภาพก่อน
      await connection.execute('DELETE FROM activity_images WHERE activity_id = ?', [id])
      
      // ลบกิจกรรม
      const [result] = await connection.execute('DELETE FROM activities WHERE id = ?', [id])
      return result.affectedRows > 0
    })
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

  static async countDocuments(filter = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }

    const rows = await query(`SELECT COUNT(*) as count FROM activities ${whereClause}`, params)
    return rows[0].count
  }
}

export default Activity
