// Updated: 2025-10-03T11:30:00
import { pool, query, transaction } from '../../database.js'
import { toLocalSql } from '../../utils/date.js'

// Helper function to format date for MySQL DATETIME using local time
function formatDateForMySQL(date) {
  return toLocalSql(date)
}

export class Activity {
  static async findById(id) {
    const rows = await query(`
      SELECT id as _id, title, description, date, published_at, is_published, created_by, updated_by, created_at, updated_at
      FROM activities WHERE id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const activity = rows[0]
    
    // ดึงรูปภาพ
    const images = await query(`
      SELECT url, public_id, display_order
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
      images: images || []
    }
  }

  static async find(filter = {}, options = {}) {
    // Return object with sort() method for MongoDB compatibility
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
        // Return new object with updated sort options
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
    
    // Handle isPublished filter
    if (filter.isPublished !== undefined) {
      whereClause += ' AND is_published = ?'
      params.push(filter.isPublished)
    }
    
    // Handle $or conditions for publishedAt
    if (filter.$or) {
      // Accept rows with NULL published_at or already past
      whereClause += ' AND (published_at IS NULL OR published_at <= NOW())'
    }

    // Handle sort options
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
      // Fallback to options.sort
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
      SELECT id as _id, title, description, date, published_at, is_published, created_by, updated_by, created_at, updated_at
      FROM activities
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    // ดึงรูปภาพสำหรับแต่ละกิจกรรม
    for (const activity of rows) {
      const images = await query(`
        SELECT url, public_id, display_order
        FROM activity_images 
        WHERE activity_id = ? 
        ORDER BY display_order ASC
      `, [activity._id])
      activity.images = images || []
      
      // แปลง snake_case เป็น camelCase
      activity.publishedAt = activity.published_at
      activity.isPublished = activity.is_published
      activity.createdAt = activity.created_at
      activity.updatedAt = activity.updated_at
      delete activity.published_at
      delete activity.is_published
      delete activity.created_by
      delete activity.updated_by
      delete activity.created_at
      delete activity.updated_at
    }

    return rows
  }

  static async create(data) {
    return await transaction(async (connection) => {
      // สร้างกิจกรรม
      const [result] = await connection.execute(`
        INSERT INTO activities (title, description, date, published_at, is_published, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.title,
        data.description || '',
        formatDateForMySQL(data.date) || new Date(),
        formatDateForMySQL(data.publishedAt) || new Date(),
        data.isPublished !== undefined ? data.isPublished : true,
        data.createdBy || null,
        data.updatedBy || null
      ])

      const activityId = result.insertId

      // เพิ่มรูปภาพ
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const image = data.images[i]
          await connection.execute(`
            INSERT INTO activity_images (activity_id, url, public_id, display_order)
            VALUES (?, ?, ?, ?)
          `, [
            activityId,
            image.url,
            image.publicId || null,
            i
          ])
        }
      }

      return { id: activityId, ...data }
    })
  }

  static async updateById(id, data) {
    return await transaction(async (connection) => {
      // อัพเดทกิจกรรม
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
      if (data.publishedAt) {
        updateFields.push('published_at = ?')
        updateParams.push(formatDateForMySQL(data.publishedAt))
      }
      if (data.isPublished !== undefined) {
        updateFields.push('is_published = ?')
        updateParams.push(data.isPublished)
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

      // อัพเดทรูปภาพ (ลบเก่าและเพิ่มใหม่)
      if (data.images !== undefined) {
        await connection.execute('DELETE FROM activity_images WHERE activity_id = ?', [id])
        
        if (data.images.length > 0) {
          for (let i = 0; i < data.images.length; i++) {
            const image = data.images[i]
            await connection.execute(`
              INSERT INTO activity_images (activity_id, url, public_id, display_order)
              VALUES (?, ?, ?, ?)
            `, [
              id,
              image.url,
              image.publicId || null,
              i
            ])
          }
        }
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    const result = await query('DELETE FROM activities WHERE id = ?', [id])
    return result.affectedRows > 0
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

  // MongoDB compatibility aliases
  static async findByIdAndUpdate(id, data, options = {}) {
    await this.updateById(id, data)
    if (options.new) {
      return await this.findById(id)
    }
    return null
  }

  static async findByIdAndDelete(id) {
    const doc = await this.findById(id)
    await this.deleteById(id)
    return doc
  }
}

export default Activity