import Activity from '../models/mysql/ActivityBlob.js'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import fs from 'fs'
import { cleanTempFile } from '../middleware/upload.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { logger } from '../utils/logger.js'

export const ActivityService = {
  async findAll(query, options, canManage) {
    let targetStatus = 'published' // Default to public view
    
    if (query.status && ['all', 'published', 'scheduled', 'hidden'].includes(query.status)) {
        if (query.status === 'published' || canManage) {
            targetStatus = query.status
        }
    } else if (query.published === 'false' && canManage) {
        targetStatus = 'all'
    }

    const filter = {
        status: targetStatus
    }

    if (query.q) {
        filter.search = query.q
    }

    const [list, total] = await Promise.all([
        Activity.find(filter, options),
        options.limit > 0 ? Activity.countDocuments(filter) : Promise.resolve(0)
    ])

    return { list, total }
  },

  async findById(id) {
    return await Activity.findById(id)
  },

  async incrementViewCount(id) {
    return await Activity.incrementViewCount(id)
  },

  async createActivity(payload, files, user) {
    const data = { ...payload }
    if (user?.username) data.createdBy = user.username

    // Sanitize user inputs
    if (data.title) data.title = sanitizeText(data.title)
    if (data.description) data.description = sanitizeHtml(data.description)

    // แปลง isPublished จาก string เป็น boolean
    if (data.isPublished !== undefined) {
      data.isPublished = data.isPublished === 'true' || data.isPublished === true
    }

    // Process images
    data.images = await this.processImages(files, data.imageUrls)

    return await Activity.create(data)
  },

  async updateActivity(id, payload, files, user) {
    const data = { ...payload }
    if (user?.username) data.updatedBy = user.username

    // Sanitize user inputs
    if (data.title) data.title = sanitizeText(data.title)
    if (data.description) data.description = sanitizeHtml(data.description)

    // แปลง isPublished จาก string เป็น boolean (สำหรับ FormData)
    if (data.isPublished !== undefined && typeof data.isPublished === 'string') {
      data.isPublished = data.isPublished === 'true'
    }

    // Process images only if new files or URLs are provided
    if ((files && files.length > 0) || data.imageUrls) {
      data.images = await this.processImages(files, data.imageUrls)
    } else if (data.images && Array.isArray(data.images)) {
      // Handle mixed content (existing images + new Data URLs)
      this.processDataUrls(data.images)
    }

    return await Activity.findByIdAndUpdate(id, data, { new: true })
  },

  async deleteActivity(id) {
    return await Activity.findByIdAndDelete(id)
  },

  async processImages(files, imageUrls) {
    const images = []

    // 1. Process uploaded files
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const kind = await fileTypeFromFile(file.path)
          // Accept anything starting with image/, or fallback to mimetype if file-type couldn't detect but multer did
          const finalMime = kind?.mime || file.mimetype
          if (!finalMime.startsWith('image/')) {
            await cleanTempFile(file)
            continue
          }
          const decodedName = decodeUploadFilename(file.originalname)
          const buffer = await fs.promises.readFile(file.path)
          images.push({
            imageData: buffer,
            fileName: decodedName,
            mimeType: finalMime,
            fileSize: file.size
          })
        } catch (err) {
          logger.warn('[ActivityService] Error processing uploaded file', { error: err.message })
        } finally {
          await cleanTempFile(file)
        }
      }
    }

    // 2. Process image URLs
    if (imageUrls) {
      const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls]
      for (const url of urls) {
        if (url && url.trim()) {
          try {
            const response = await fetch(url.trim())
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const contentType = response.headers.get('content-type') || 'application/octet-stream'

            let fileName = 'image.jpg'
            try {
              const urlObj = new URL(url)
              const pathParts = urlObj.pathname.split('/')
              fileName = pathParts[pathParts.length - 1] || 'image.jpg'
            } catch { }

            const kind = await fileTypeFromBuffer(buffer)
            const finalMime = kind?.mime || contentType
            if (!finalMime.startsWith('image/')) continue

            images.push({ 
              imageData: buffer, 
              fileName, 
              mimeType: finalMime, 
              fileSize: buffer.length 
            })
          } catch (err) {
            logger.error('[ActivityService] Failed to download image from URL', { url, error: err.message })
          }
        }
      }
    }

    return images
  },

  processDataUrls(images) {
    for (const img of images) {
      if (img.url && typeof img.url === 'string' && img.url.startsWith('data:')) {
        try {
          const matches = img.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
          if (matches && matches.length === 3) {
            img.mimeType = matches[1]
            img.imageData = Buffer.from(matches[2], 'base64')
            img.fileName = img.name || 'image.webp'
            img.fileSize = img.bytes || img.imageData.length
          }
        } catch (err) {
          logger.error('[ActivityService] Failed to parse Data URL image', { error: err.message })
        }
      }
    }
  }
}
