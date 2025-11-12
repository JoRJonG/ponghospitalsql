// Updated: 2025-10-03T11:30:00
import { pool, query, transaction } from '../../database.js'

// Helper function to format date for MySQL DATETIME
function formatDateForMySQL(date) {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export class Announcement {
  static async findById(id) {
    const rows = await query(`
      SELECT a.id as _id, a.title, c.display_name as category_name, c.name as category_code,
             a.content, a.published_at, a.is_published, a.created_by,
             a.updated_by, a.created_at, a.updated_at,
             COALESCE(a.view_count, 0) as view_count
      FROM announcements a
      JOIN announcement_categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [id])
    
    if (!rows[0]) return null
    
    const announcement = rows[0]
    
    // ดึง attachments
    const attachments = await query(`
      SELECT id, kind, file_name as name, file_size as bytes, display_order
      FROM announcement_attachments 
      WHERE announcement_id = ? 
      ORDER BY display_order ASC
    `, [id])
    
    // สร้าง URL สำหรับ serve file
    const attachmentsWithUrl = attachments.map(att => ({
      ...att,
      url: `/api/images/announcements/${id}/${att.id}`,
      publicId: att.id
    }))
    
    return {
      _id: announcement._id,
      title: announcement.title,
      category: announcement.category_name,
      categoryCode: announcement.category_code,
      content: announcement.content,
      publishedAt: announcement.published_at,
      isPublished: announcement.is_published,
      createdBy: announcement.created_by,
      updatedBy: announcement.updated_by,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
      viewCount: announcement.view_count,
      attachments: attachmentsWithUrl
    }
  }

  static async incrementViewCount(id) {
    await query(`
      UPDATE announcements 
      SET view_count = view_count + 1 
      WHERE id = ?
    `, [id])
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
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND a.is_published = ?'
      params.push(filter.isPublished)
    }
    
    if (filter.category) {
      // รองรับทั้ง category_code และ category_name (display_name)
      whereClause += ' AND (c.name = ? OR c.display_name = ?)'
      params.push(filter.category, filter.category)
    }
    
    // Handle $or conditions for publishedAt
    if (filter.$or) {
      whereClause += ' AND a.published_at <= NOW()'
    }

    let orderClause = 'ORDER BY a.published_at DESC'
    if (sortOptions) {
      const orderParts = []
      if (sortOptions.publishedAt) {
        orderParts.push(`a.published_at ${sortOptions.publishedAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (sortOptions.updatedAt) {
        orderParts.push(`a.updated_at ${sortOptions.updatedAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (sortOptions.createdAt) {
        orderParts.push(`a.created_at ${sortOptions.createdAt === -1 ? 'DESC' : 'ASC'}`)
      }
      if (orderParts.length > 0) {
        orderClause = 'ORDER BY ' + orderParts.join(', ')
      }
    } else if (options.sort) {
      if (options.sort.publishedAt) {
        orderClause = `ORDER BY a.published_at ${options.sort.publishedAt === -1 ? 'DESC' : 'ASC'}`
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
      SELECT a.id as _id, a.title, c.display_name as category_name, c.name as category_code,
             a.content, a.published_at, a.is_published, a.created_by,
             a.updated_by, a.created_at, a.updated_at, a.view_count
      FROM announcements a
      JOIN announcement_categories c ON a.category_id = c.id
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `, params)

    // ดึง attachments สำหรับแต่ละประกาศ
    for (const announcement of rows) {
      const attachments = await query(`
        SELECT id, kind, file_name as name, file_size as bytes, display_order
        FROM announcement_attachments 
        WHERE announcement_id = ? 
        ORDER BY display_order ASC
      `, [announcement._id])
      
      // สร้าง URL สำหรับ serve file และแปลงเป็น camelCase
      announcement.attachments = attachments.map(att => ({
        ...att,
        url: `/api/images/announcements/${announcement._id}/${att.id}`,
        publicId: att.id
      }))
      
      // แปลง snake_case เป็น camelCase และเปลี่ยน category เป็น display_name
      announcement.category = announcement.category_name
      announcement.categoryCode = announcement.category_code
      announcement.publishedAt = announcement.published_at
      announcement.isPublished = announcement.is_published
      announcement.createdBy = announcement.created_by
      announcement.updatedBy = announcement.updated_by
      announcement.createdAt = announcement.created_at
      announcement.updatedAt = announcement.updated_at
      announcement.viewCount = announcement.view_count
      delete announcement.category_name
      delete announcement.category_code
      delete announcement.published_at
      delete announcement.is_published
      delete announcement.created_by
      delete announcement.updated_by
      delete announcement.created_at
      delete announcement.updated_at
      delete announcement.view_count
    }

    return rows
  }

  static async create(data) {
    return await transaction(async (connection) => {
      // หา category_id (ค้นหาทั้ง name และ display_name)
      const [categories] = await connection.execute(
        'SELECT id FROM announcement_categories WHERE name = ? OR display_name = ?',
        [data.category, data.category]
      )
      
      if (!categories[0]) {
        throw new Error(`Category '${data.category}' not found`)
      }
      
      const categoryId = categories[0].id

      // สร้างประกาศ
      // Normalize publishedAt to JS Date (MySQL driver handles Date objects)
      let publishedAtVal = new Date()
      if (data.publishedAt) {
        const d = new Date(data.publishedAt)
        if (isNaN(d.getTime())) {
          throw new Error(`Invalid publishedAt: ${data.publishedAt}`)
        }
        publishedAtVal = d
      }

      const [result] = await connection.execute(`
        INSERT INTO announcements (title, category_id, content, published_at, is_published, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.title,
        categoryId,
        data.content || '',
        formatDateForMySQL(publishedAtVal),
        data.isPublished !== undefined ? data.isPublished : true,
        data.createdBy || null,
        data.updatedBy || null
      ])

      const announcementId = result.insertId

      // เพิ่ม attachments
      if (data.attachments && data.attachments.length > 0) {
        for (let i = 0; i < data.attachments.length; i++) {
          const attachment = data.attachments[i]
          
          // console.log('[Announcement.create] Attachment:', {
          //   kind: attachment.kind,
          //   name: attachment.name,
          //   urlStart: attachment.url?.substring(0, 50),
          //   isDataUrl: attachment.url?.startsWith('data:'),
          //   isApiUrl: attachment.url?.startsWith('/api/images/')
          // })
          
          // ข้าม attachment ที่เป็น URL /api/images/ แล้ว (คงอยู่แล้วใน DB)
          if (attachment.url && attachment.url.startsWith('/api/images/')) {
            // console.log('[Announcement.create] Skipping existing attachment:', attachment.url)
            continue
          }
          
          // แปลง data URL เป็น Buffer
          let fileData = null
          let mimeType = attachment.resourceType === 'pdf' ? 'application/pdf' : 'image/jpeg'
          let fileSize = attachment.bytes || 0
          
          if (attachment.url && attachment.url.startsWith('data:')) {
            const matches = attachment.url.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              mimeType = matches[1]
              fileData = Buffer.from(matches[2], 'base64')
              fileSize = fileData.length
            }
          }
          
          await connection.execute(`
            INSERT INTO announcement_attachments (announcement_id, file_data, mime_type, file_size, kind, file_name, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            announcementId,
            fileData,
            mimeType,
            fileSize,
            attachment.kind || 'image',
            attachment.name || null,
            i
          ])
        }
      }

      return { id: announcementId, ...data }
    })
  }

  static async updateById(id, data) {
    return await transaction(async (connection) => {
      let categoryId = null
      
      if (data.category) {
        const [categories] = await connection.execute(
          'SELECT id FROM announcement_categories WHERE name = ? OR display_name = ?',
          [data.category, data.category]
        )
        
        if (!categories[0]) {
          throw new Error(`Category '${data.category}' not found`)
        }
        categoryId = categories[0].id
      }

      // อัพเดทประกาศ
      const updateFields = []
      const updateParams = []
      
      if (data.title) {
        updateFields.push('title = ?')
        updateParams.push(data.title)
      }
      if (categoryId) {
        updateFields.push('category_id = ?')
        updateParams.push(categoryId)
      }
      if (data.content !== undefined) {
        updateFields.push('content = ?')
        updateParams.push(data.content)
      }
      if (data.publishedAt !== undefined) {
        // If provided, convert to Date (reject invalid format)
        let d = null
        if (data.publishedAt) {
          const t = new Date(data.publishedAt)
          if (isNaN(t.getTime())) {
            throw new Error(`Invalid publishedAt: ${data.publishedAt}`)
          }
          d = t
        }
        updateFields.push('published_at = ?')
        updateParams.push(formatDateForMySQL(d) || new Date())
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
          UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?
        `, updateParams)
      }

      // อัพเดท attachments (ลบเก่าและเพิ่มใหม่)
      if (data.attachments !== undefined) {
        // ดึง attachment เดิมที่มีอยู่ใน DB
        const [existingAttachments] = await connection.execute(
          'SELECT id, file_name FROM announcement_attachments WHERE announcement_id = ?',
          [id]
        )
        const existingIds = new Set()
        
        // ลบ attachment เก่าที่ไม่ได้ส่งมาในครั้งนี้
        for (const existing of existingAttachments) {
          const stillExists = data.attachments.some(att => 
            att.url === `/api/images/announcements/${id}/${existing.id}`
          )
          if (!stillExists) {
            await connection.execute('DELETE FROM announcement_attachments WHERE id = ?', [existing.id])
          } else {
            existingIds.add(existing.id)
          }
        }
        
        // เพิ่ม attachment ใหม่ (เฉพาะ data URL)
        if (data.attachments.length > 0) {
          for (let i = 0; i < data.attachments.length; i++) {
            const attachment = data.attachments[i]
            
            // ข้าม attachment ที่เป็น URL /api/images/ แล้ว (อยู่ใน DB อยู่แล้ว)
            if (attachment.url && attachment.url.startsWith('/api/images/')) {
              continue
            }
            
            // แปลง data URL เป็น Buffer
            let fileData = null
            let mimeType = attachment.resourceType === 'pdf' ? 'application/pdf' : 'image/jpeg'
            let fileSize = attachment.bytes || 0
            
            if (attachment.url && attachment.url.startsWith('data:')) {
              const matches = attachment.url.match(/^data:([^;]+);base64,(.+)$/)
              if (matches) {
                mimeType = matches[1]
                fileData = Buffer.from(matches[2], 'base64')
                fileSize = fileData.length
              }
            }
            
            await connection.execute(`
              INSERT INTO announcement_attachments (announcement_id, file_data, mime_type, file_size, kind, file_name, display_order)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              id,
              fileData,
              mimeType,
              fileSize,
              attachment.kind || 'image',
              attachment.name || null,
              i
            ])
          }
        }
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    const result = await query('DELETE FROM announcements WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  static async countDocuments(filter = {}) {
    let whereClause = 'WHERE 1=1'
    let params = []
    
    if (filter.isPublished !== undefined) {
      whereClause += ' AND a.is_published = ?'
      params.push(filter.isPublished)
    }

    const rows = await query(`
      SELECT COUNT(*) as count 
      FROM announcements a 
      JOIN announcement_categories c ON a.category_id = c.id
      ${whereClause}
    `, params)
    
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

export default Announcement