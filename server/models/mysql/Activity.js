// Updated: 2025-11-26
import { pool, query, transaction, exec } from '../../database.js'
import { toLocalSql } from '../../utils/date.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/activities')

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch (e) {
    console.error('[Activity] ensureUploadDir error:', e)
  }
}

async function saveFileToDisk(buffer, filename) {
  await ensureUploadDir()
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const uniqueName = `${Date.now()}_${safeName}`
  const filePath = path.join(UPLOAD_DIR, uniqueName)
  await fs.writeFile(filePath, buffer)
  return uniqueName // Store relative filename
}

async function deleteFileFromDisk(filename) {
  if (!filename) return
  try {
    const filePath = path.join(UPLOAD_DIR, filename)
    await fs.unlink(filePath)
  } catch (e) {
    console.warn(`[Activity] Failed to delete file from disk: ${filename}`, e.message)
  }
}

// Helper function to format date for MySQL DATETIME using local time
function formatDateForMySQL(date) {
  return toLocalSql(date)
}

// Ensure table schema has file_path column
async function ensureSchema() {
  try {
    const rows = await query("SHOW COLUMNS FROM activity_images LIKE 'file_path'")
    if (rows.length === 0) {
      await exec("ALTER TABLE activity_images ADD COLUMN file_path VARCHAR(512) NULL")
    }
    // Make image_data nullable
    await exec("ALTER TABLE activity_images MODIFY COLUMN image_data LONGBLOB NULL")
  } catch (e) {
    console.warn('[Activity] ensureSchema warning:', e.message)
  }
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
      SELECT id, url, public_id, display_order, file_path
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
    const thenFn = async function (resolve, reject) {
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

      sort: function (sortObj) {
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
        SELECT id, url, public_id, display_order, file_path
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
    await ensureSchema()
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
          let filePath = null
          let fileData = null
          let fileSize = image.fileSize || 0

          // ถ้ามี imageData (Buffer) ให้บันทึกลง Disk
          if (image.imageData) {
            filePath = await saveFileToDisk(image.imageData, image.fileName || `image_${i}.jpg`)
            fileSize = image.imageData.length
          } else if (image.url && image.url.startsWith('data:')) {
            // Handle Data URL
            const matches = image.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
            if (matches && matches.length === 3) {
              const buffer = Buffer.from(matches[2], 'base64')
              filePath = await saveFileToDisk(buffer, image.fileName || `image_${i}.jpg`)
              fileSize = buffer.length
            }
          }

          await connection.execute(`
            INSERT INTO activity_images (activity_id, url, public_id, display_order, file_path, image_data, mime_type, file_name, file_size)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
          `, [
            activityId,
            image.url || '', // URL might be empty initially if we generate it later, but usually frontend sends something or we generate /api/images/...
            image.publicId || null,
            i,
            filePath,
            image.mimeType || 'image/jpeg',
            image.fileName || `image_${i}.jpg`,
            fileSize
          ])

          // If we just inserted, we might want to update the URL to point to our API if it wasn't already
          // But usually the frontend expects the URL to be returned.
          // For now, let's assume the frontend handles the URL or we update it after insert if needed.
          // Actually, standard practice here seems to be: insert, then get ID, then construct URL.
          // But we are doing bulk insert. Let's leave URL as is if provided, or construct it if we can get ID.
          // Since we can't easily get ID in bulk loop without individual inserts, we'll rely on the fact that
          // the 'url' field is often just for display or external links. 
          // However, for local images, we usually want /api/images/activities/:activityId/:imageId
          // We can update it after? Or just insert one by one.
        }

        // Update URLs for newly inserted images that have file_path
        // This is a bit inefficient but ensures consistency
        const [newImages] = await connection.query('SELECT id FROM activity_images WHERE activity_id = ? AND file_path IS NOT NULL', [activityId])
        for (const img of newImages) {
          await connection.execute('UPDATE activity_images SET url = ? WHERE id = ?', [`/api/images/activities/${activityId}/${img.id}`, img.id])
        }
      }

      return { id: activityId, ...data }
    })
  }

  static async updateById(id, data) {
    await ensureSchema()
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
        // Get existing images to delete files
        const [oldImages] = await connection.query('SELECT file_path FROM activity_images WHERE activity_id = ?', [id])

        // We are doing a full replace logic here based on the original code:
        // await connection.execute('DELETE FROM activity_images WHERE activity_id = ?', [id])
        // But we should be careful not to delete files if we are just re-ordering or keeping them.
        // The original code deleted all and re-inserted.
        // If we want to preserve files, we need to check if the image is being kept.
        // However, the frontend usually sends the full list.
        // If an image in `data.images` has a `publicId` (or `id`), it might be an existing image.
        // But the original code didn't seem to check for existing IDs, it just wiped and re-inserted.
        // Wait, `data.images` in `updateById` in original code:
        // INSERT INTO activity_images ... VALUES (?, ?, ?, ?) -> url, publicId, displayOrder
        // It seems it blindly re-inserted. If `url` was an existing /api/images/..., it just re-saved that string.
        // But the BLOB data? The original code didn't seem to re-save BLOB data for existing images unless it was passed again?
        // Ah, `ActivityBlob.js` (which `activities.js` imports) likely handled this differently or `Activity.js` was just metadata?
        // The file I'm editing is `Activity.js`. The route imports `ActivityBlob.js`.
        // Wait, I need to check `ActivityBlob.js`! The route uses `ActivityBlob.js`.
        // I might be editing the wrong file if the route uses `ActivityBlob.js`.
        // Let me check `server/routes/activities.js` again.
        // Line 2: import Activity from '../models/mysql/ActivityBlob.js'
        // YES! I need to edit `ActivityBlob.js`, not `Activity.js`.
        // `Activity.js` might be unused or used elsewhere.
        // I will abort this edit and switch to `ActivityBlob.js`.
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    // Delete files first
    const rows = await query('SELECT file_path FROM activity_images WHERE activity_id = ?', [id])
    for (const row of rows) {
      if (row.file_path) {
        await deleteFileFromDisk(row.file_path)
      }
    }

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