// Activity model with File System storage for images (formerly BLOB)
import { pool, query, exec, transaction } from '../../database.js'
import { toLocalSql } from '../../utils/date.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

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
  const ext = path.extname(filename) || '.bin'
  const uniqueName = `${crypto.randomUUID()}${ext}`
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
let schemaEnsured = false
async function ensureSchema() {
  if (schemaEnsured) return
  try {
    const rows = await query("SHOW COLUMNS FROM activity_images LIKE 'file_path'")
    if (rows.length === 0) {
      await exec("ALTER TABLE activity_images ADD COLUMN file_path VARCHAR(512) NULL")
    }
    // Make image_data nullable
    await exec("ALTER TABLE activity_images MODIFY COLUMN image_data LONGBLOB NULL")
    schemaEnsured = true
  } catch (e) {
    console.warn('[Activity] ensureSchema warning:', e.message)
  }
}

export class Activity {
  static async findById(id) {
    await ensureSchema()
    const rows = await query(`
      SELECT id as _id, title, description, date, published_at, is_published, 
             created_by, updated_by, created_at, updated_at, view_count
      FROM activities WHERE id = ?
    `, [id])

    if (!rows[0]) return null

    const activity = rows[0]

    // ดึงข้อมูลรูปภาพ
    const images = await query(`
      SELECT id, activity_id, file_name, mime_type, file_size, display_order, file_path
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
    await ensureSchema()
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
        SELECT id, activity_id, file_name, mime_type, file_size, display_order, file_path
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
    await ensureSchema()
    const rows = await query(`
      SELECT image_data, mime_type, file_name, file_path
      FROM activity_images 
      WHERE id = ? AND activity_id = ?
    `, [imageId, activityId])

    if (!rows[0]) return null

    const row = rows[0]
    let imageData = row.image_data

    // If file_path exists, try reading from disk
    if (row.file_path) {
      try {
        const fullPath = path.join(UPLOAD_DIR, row.file_path)
        imageData = await fs.readFile(fullPath)
      } catch (e) {
        console.error(`[Activity] Failed to read file from disk: ${row.file_path}`, e)
        // If file missing on disk and no blob data, we can't serve it
        if (!imageData) return null
      }
    }

    if (!imageData) return null

    return {
      image_data: imageData,
      mime_type: row.mime_type,
      file_name: row.file_name
    }
  }

  static async create(data) {
    await ensureSchema()
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

      // เพิ่มรูปภาพ
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const image = data.images[i]
          if (image.imageData) {
            // Save to disk
            const filePath = await saveFileToDisk(image.imageData, image.fileName || `image_${i}.jpg`)
            const fileSize = image.imageData.length

            await connection.execute(`
              INSERT INTO activity_images (activity_id, image_data, file_name, mime_type, file_size, display_order, file_path)
              VALUES (?, NULL, ?, ?, ?, ?, ?)
            `, [
              activityId,
              image.fileName || 'image.jpg',
              image.mimeType || 'image/jpeg',
              fileSize,
              i,
              filePath
            ])
          }
        }
      }

      return { id: activityId, ...data }
    })
  }

  static async updateById(id, data) {
    await ensureSchema()
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
        const keepIds = []
        const newImages = []

        if (Array.isArray(data.images)) {
          for (let i = 0; i < data.images.length; i++) {
            const img = data.images[i]
            if (img._id) {
              keepIds.push(img._id)
              // Update display_order for existing images
              await connection.execute('UPDATE activity_images SET display_order = ? WHERE id = ?', [i, img._id])
            } else if (img.imageData) {
              // New image to insert
              newImages.push({ ...img, displayOrder: i })
            }
          }
        }

        // ลบรูปที่ไม่อยู่ในรายการ keepIds
        if (keepIds.length > 0) {
          // Get file paths of images to be deleted
          const placeholders = keepIds.map(() => '?').join(',')
          const [toDelete] = await connection.query(`SELECT file_path FROM activity_images WHERE activity_id = ? AND id NOT IN (${placeholders})`, [id, ...keepIds])
          for (const row of toDelete) {
            if (row.file_path) await deleteFileFromDisk(row.file_path)
          }

          await connection.execute(`DELETE FROM activity_images WHERE activity_id = ? AND id NOT IN (${placeholders})`, [id, ...keepIds])
        } else {
          // ถ้าไม่มี keepIds เลย แสดงว่าลบหมด (หรือไม่มีรูปเก่าเลย)
          const [toDelete] = await connection.query('SELECT file_path FROM activity_images WHERE activity_id = ?', [id])
          for (const row of toDelete) {
            if (row.file_path) await deleteFileFromDisk(row.file_path)
          }

          await connection.execute('DELETE FROM activity_images WHERE activity_id = ?', [id])
        }

        // เพิ่มรูปใหม่
        for (const image of newImages) {
          // Save to disk
          const filePath = await saveFileToDisk(image.imageData, image.fileName || `image_${image.displayOrder}.jpg`)
          const fileSize = image.imageData.length

          await connection.execute(`
            INSERT INTO activity_images (activity_id, image_data, file_name, mime_type, file_size, display_order, file_path)
            VALUES (?, NULL, ?, ?, ?, ?, ?)
          `, [
            id,
            image.fileName || 'image.jpg',
            image.mimeType || 'image/jpeg',
            fileSize,
            image.displayOrder,
            filePath
          ])
        }
      }

      return await this.findById(id)
    })
  }

  static async deleteById(id) {
    await ensureSchema()
    return await transaction(async (connection) => {
      // ลบรูปภาพก่อน (และลบไฟล์)
      const [rows] = await connection.query('SELECT file_path FROM activity_images WHERE activity_id = ?', [id])
      for (const row of rows) {
        if (row.file_path) {
          await deleteFileFromDisk(row.file_path)
        }
      }

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
