import { query } from '../database.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeText } from '../utils/sanitization.js'
import { purgeCachePrefix } from '../middleware/cache.js'

export const InfographicService = {
  async getInfographicMetadata(id) {
    const rows = await query(
      'SELECT id, title, image_size, mime_type, display_order, is_published, created_at, updated_at FROM infographics WHERE id = ?',
      [id]
    )
    if (!rows[0]) return null

    const row = rows[0]
    return {
      _id: row.id,
      title: row.title,
      imageUrl: `/api/images/infographics/${row.id}`,
      imageSize: row.image_size,
      mimeType: row.mime_type,
      displayOrder: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  },

  async createInfographic(payload, file, user) {
    if (!file) throw new Error('Image file is required')

    try {
      const kind = await fileTypeFromFile(file.path)
      if (!kind || !kind.mime.startsWith('image/')) {
        throw new Error('Invalid image file')
      }

      const fileName = decodeUploadFilename(file.originalname)
      const title = payload.title ? sanitizeText(payload.title) : fileName
      
      let isPublished = true
      if (payload.isPublished !== undefined) {
        isPublished = payload.isPublished === 'true' || payload.isPublished === true
      }
      
      const displayOrder = parseInt(payload.displayOrder, 10) || 0

      const { buffer, mimetype } = await optimizeImage(file.path, kind.mime, { maxWidth: 1920 })
      const finalSize = buffer.length

      const result = await query(
        `INSERT INTO infographics (title, image_data, image_size, mime_type, display_order, is_published, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          buffer,
          finalSize,
          mimetype,
          displayOrder,
          isPublished,
          user?.username || null,
          user?.username || null
        ]
      )

      purgeCachePrefix('/api/infographics')
      return result.insertId
    } finally {
      await cleanTempFile(file)
    }
  },

  async updateInfographic(id, payload, file, user) {
    try {
      const updates = []
      const values = []

      if (payload.title) {
        updates.push('title = ?')
        values.push(sanitizeText(payload.title))
      }

      if (payload.isPublished !== undefined) {
        updates.push('is_published = ?')
        values.push(payload.isPublished === 'true' || payload.isPublished === true)
      }

      const displayOrder = parseInt(payload.displayOrder, 10)
      if (!isNaN(displayOrder)) {
        updates.push('display_order = ?')
        values.push(displayOrder)
      }

      if (file) {
        const kind = await fileTypeFromFile(file.path)
        if (!kind || !kind.mime.startsWith('image/')) {
          throw new Error('Invalid image file')
        }

        const { buffer, mimetype } = await optimizeImage(file.path, kind.mime, { maxWidth: 1920 })
        updates.push('image_data = ?', 'image_size = ?', 'mime_type = ?')
        values.push(buffer, buffer.length, mimetype)
      }

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push('updated_by = ?')
      values.push(user?.username || null)
      values.push(id)

      await query(
        `UPDATE infographics SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      purgeCachePrefix('/api/infographics')
      return true
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteInfographic(id) {
    await query('DELETE FROM infographics WHERE id = ?', [id])
    purgeCachePrefix('/api/infographics')
    return true
  },

  async reorderInfographics(orderArray) {
    if (!Array.isArray(orderArray)) {
      throw new Error('Order must be an array of IDs')
    }

    for (let i = 0; i < orderArray.length; i++) {
      await query('UPDATE infographics SET display_order = ? WHERE id = ?', [i, orderArray[i]])
    }

    purgeCachePrefix('/api/infographics')
    return true
  }
}
