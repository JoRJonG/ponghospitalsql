import { query } from '../database.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { sanitizeText } from '../utils/sanitization.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pr_posters')

const prepareUploadDir = async () => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create upload directory:', e)
  }
}

export const PRPosterService = {
  async getMetadata(id) {
    const rows = await query(
      'SELECT id, title, image_path, image_size, mime_type, display_order, is_published, created_at, updated_at FROM pr_posters WHERE id = ?',
      [id]
    )
    if (!rows[0]) return null
    
    const row = rows[0]
    return {
      _id: row.id,
      title: row.title,
      imageUrl: `/api/images/pr-posters/${row.id}?t=${new Date(row.updated_at).getTime()}`,
      imageSize: row.image_size,
      mimeType: row.mime_type,
      displayOrder: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  },

  async createPoster(payload, file, user) {
    if (!file) throw new Error('Image file is required')

    try {
      const kind = await fileTypeFromFile(file.path)
      if (!kind || !kind.mime.startsWith('image/')) {
        throw new Error('Invalid image file')
      }

      const decodedName = decodeUploadFilename(file.originalname)
      const title = payload.title ? sanitizeText(payload.title) : decodedName
      const isPublished = payload.isPublished === 'true' || payload.isPublished === true
      const displayOrder = parseInt(payload.displayOrder, 10) || 0

      let optimizedBuffer = null
      let finalMime = kind.mime
      let ext = path.extname(decodedName).toLowerCase() || '.jpg'

      try {
        if (kind.mime !== 'image/gif') {
          const optimized = await optimizeImage(file.path, kind.mime, { maxWidth: 1920 })
          optimizedBuffer = optimized.buffer
          finalMime = optimized.mimetype
          ext = '.webp'
        }
      } catch (optErr) {
        console.warn('PRPoster image optimization failed, using original:', optErr?.message)
      }

      if (!optimizedBuffer) {
        optimizedBuffer = await fs.readFile(file.path)
      }

      await prepareUploadDir()

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const filename = `poster-${uniqueSuffix}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)

      await fs.writeFile(filePath, optimizedBuffer)
      const relativePath = `pr_posters/${filename}`

      const result = await query(
        `INSERT INTO pr_posters (title, image_path, image_data, image_size, mime_type, display_order, is_published, created_by, updated_by)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          relativePath,
          optimizedBuffer.length,
          finalMime,
          displayOrder,
          isPublished,
          user?.username || null,
          user?.username || null
        ]
      )

      purgeCachePrefix('/api/pr-posters')
      return result.insertId
    } finally {
      await cleanTempFile(file)
    }
  },

  async updatePoster(id, payload, file, user) {
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

      if (payload.displayOrder !== undefined) {
        updates.push('display_order = ?')
        values.push(parseInt(payload.displayOrder, 10))
      }

      if (file) {
        const kind = await fileTypeFromFile(file.path)
        if (!kind || !kind.mime.startsWith('image/')) {
          throw new Error('Invalid image file')
        }

        let optimizedBuffer = null
        let finalMime = kind.mime
        let ext = path.extname(file.originalname).toLowerCase() || '.jpg'

        try {
          if (kind.mime !== 'image/gif') {
            const optimized = await optimizeImage(file.path, kind.mime, { maxWidth: 1920 })
            optimizedBuffer = optimized.buffer
            finalMime = optimized.mimetype
            ext = '.webp'
          }
        } catch (optErr) {
          console.warn('PRPoster image optimization failed:', optErr?.message)
        }

        if (!optimizedBuffer) {
          optimizedBuffer = await fs.readFile(file.path)
        }

        try {
          const [rows] = await query('SELECT image_path FROM pr_posters WHERE id = ?', [id])
          if (rows[0] && rows[0].image_path) {
            const dbPath = rows[0].image_path
            const candidates = [
              path.join(process.cwd(), 'uploads', dbPath),
              path.join(process.cwd(), dbPath)
            ]
            for (const candidate of candidates) {
              try {
                if (existsSync(candidate)) {
                  await fs.unlink(candidate)
                  break
                }
              } catch (e) { }
            }
          }
        } catch (err) { console.warn('Ignore old file cleanup error', err) }

        await prepareUploadDir()

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const filename = `poster-${uniqueSuffix}${ext}`
        const fullPath = path.join(UPLOAD_DIR, filename)

        await fs.writeFile(fullPath, optimizedBuffer)
        const relativePath = `pr_posters/${filename}`

        updates.push('image_path = ?', 'image_data = NULL', 'image_size = ?', 'mime_type = ?')
        values.push(relativePath, optimizedBuffer.length, finalMime)
      }

      if (updates.length === 0) throw new Error('No fields to update')

      updates.push('updated_by = ?')
      values.push(user?.username || null)
      values.push(id)

      await query(
        `UPDATE pr_posters SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      purgeCachePrefix('/api/pr-posters')
      return true
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deletePoster(id) {
    const rows = await query('SELECT image_path FROM pr_posters WHERE id = ?', [id])
    if (!rows[0]) throw new Error('Poster not found')

    const dbPath = rows[0].image_path

    await query('DELETE FROM pr_posters WHERE id = ?', [id])

    if (dbPath) {
      const candidates = [
        path.join(process.cwd(), 'uploads', dbPath),
        path.join(process.cwd(), dbPath),
        path.join(process.cwd(), 'server', 'uploads', dbPath)
      ]
      for (const candidate of candidates) {
        try {
          if (existsSync(candidate)) {
            await fs.unlink(candidate)
            break
          }
        } catch (e) {
          console.error('[pr_posters] Error deleting file:', e.message)
        }
      }
    }

    purgeCachePrefix('/api/pr-posters')
    return true
  },

  async reorderPosters(orderArray, startOrder = 0) {
    if (!Array.isArray(orderArray)) {
      throw new Error('Order must be an array of IDs')
    }

    const offset = parseInt(startOrder) || 0
    for (let i = 0; i < orderArray.length; i++) {
      await query('UPDATE pr_posters SET display_order = ? WHERE id = ?', [i + offset, orderArray[i]])
    }

    purgeCachePrefix('/api/pr-posters')
    return true
  }
}
