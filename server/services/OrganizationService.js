import { query } from '../database.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'organization')

const prepareUploadDir = async () => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create upload directory:', e)
  }
}

export const OrganizationService = {
  async findAll(wantAll = false) {
    let sql = 'SELECT * FROM organization_charts'
    if (!wantAll) {
      sql += ' WHERE is_published = TRUE'
    }
    sql += ' ORDER BY display_order ASC, created_at DESC'

    return await query(sql)
  },

  async createChart(payload, file, user) {
    if (!file) throw new Error('Image is required')

    try {
      const kind = await fileTypeFromFile(file.path)
      if (!kind || !kind.mime.startsWith('image/')) {
        throw new Error('Invalid image file')
      }

      await prepareUploadDir()

      const { buffer, mimetype } = await optimizeImage(file.path, kind.mime, { maxWidth: 2000 })
      
      let ext = '.webp'
      if (mimetype === 'image/gif') {
        ext = path.extname(file.originalname).toLowerCase() || '.gif'
      } else if (mimetype === 'image/jpeg') {
        ext = '.jpg'
      }

      const filename = `${Date.now()}-${randomUUID()}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      await fs.writeFile(filePath, buffer)

      const isPublished = payload.isPublished === 'true' || payload.isPublished === true
      const displayOrder = payload.displayOrder ? parseInt(payload.displayOrder) : 0

      await query(
        `INSERT INTO organization_charts (title, image_path, display_order, is_published, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payload.title || file.originalname,
          filename,
          displayOrder,
          isPublished,
          user?.username,
          user?.username
        ]
      )

      return true
    } finally {
      await cleanTempFile(file)
    }
  },

  async updateChart(id, payload, file, user) {
    try {
      const rows = await query('SELECT image_path FROM organization_charts WHERE id = ?', [id])
      if (!rows[0]) throw new Error('Not found')

      const updates = []
      const values = []

      if (payload.title !== undefined) {
        updates.push('title = ?')
        values.push(payload.title)
      }

      if (payload.isPublished !== undefined) {
        updates.push('is_published = ?')
        values.push(payload.isPublished === 'true' || payload.isPublished === true)
      }

      if (payload.displayOrder !== undefined) {
        updates.push('display_order = ?')
        values.push(parseInt(payload.displayOrder))
      }

      if (file) {
        const kind = await fileTypeFromFile(file.path)
        if (!kind || !kind.mime.startsWith('image/')) {
          throw new Error('Invalid image file')
        }

        await prepareUploadDir()

        const { buffer, mimetype } = await optimizeImage(file.path, kind.mime, { maxWidth: 2000 })
        
        let ext = '.webp'
        if (mimetype === 'image/gif') {
          ext = path.extname(file.originalname).toLowerCase() || '.gif'
        } else if (mimetype === 'image/jpeg') {
          ext = '.jpg'
        }

        const filename = `${Date.now()}-${randomUUID()}${ext}`
        const filePath = path.join(UPLOAD_DIR, filename)
        await fs.writeFile(filePath, buffer)

        updates.push('image_path = ?')
        values.push(filename)

        // Delete old file
        if (rows[0].image_path) {
          const oldPath = path.join(UPLOAD_DIR, rows[0].image_path)
          try {
            if (await fs.stat(oldPath).catch(() => false)) {
              await fs.unlink(oldPath)
            }
          } catch (e) { }
        }
      }

      if (updates.length > 0) {
        updates.push('updated_by = ?')
        values.push(user?.username)

        values.push(id)

        await query(
          `UPDATE organization_charts SET ${updates.join(', ')} WHERE id = ?`,
          values
        )
      }

      return true
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteChart(id) {
    const rows = await query('SELECT image_path FROM organization_charts WHERE id = ?', [id])
    if (!rows[0]) throw new Error('Not found')

    await query('DELETE FROM organization_charts WHERE id = ?', [id])

    if (rows[0].image_path) {
      const filePath = path.join(UPLOAD_DIR, rows[0].image_path)
      try {
        if (await fs.stat(filePath).catch(() => false)) {
          await fs.unlink(filePath)
        }
      } catch (e) { }
    }

    return true
  },

  async reorderCharts(orderArray) {
    if (!Array.isArray(orderArray)) throw new Error('Invalid order data')

    for (let i = 0; i < orderArray.length; i++) {
      await query('UPDATE organization_charts SET display_order = ? WHERE id = ?', [i, orderArray[i]])
    }
    return true
  }
}
