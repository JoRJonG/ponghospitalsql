import Executive from '../models/mysql/Executive.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'

export const ExecutiveService = {
  async findAll() {
    return await Executive.findAll()
  },

  async findById(id) {
    return await Executive.findById(id)
  },

  async createExecutive(payload, file) {
    try {
      const data = this._preparePayload(payload)

      if (file) {
        await this._processFile(file, data)
      } else if (payload.imageUrl) {
        await this._processUrl(payload.imageUrl, data)
      }

      return await Executive.create(data)
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async updateExecutive(id, payload, file) {
    try {
      const data = this._preparePayload(payload)

      if (file) {
        await this._processFile(file, data)
      } else if (payload.imageUrl && !payload.imageUrl.startsWith('/api/')) {
        await this._processUrl(payload.imageUrl, data)
      }

      return await Executive.updateById(id, data)
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteExecutive(id) {
    return await Executive.deleteById(id)
  },

  async updateDisplayOrders(orderMap) {
    return await Executive.updateDisplayOrders(orderMap)
  },

  _preparePayload(payload) {
    const data = {}
    if (payload.name !== undefined) data.name = sanitizeText(payload.name)
    if (payload.position !== undefined) data.position = sanitizeText(payload.position)
    if (payload.phone !== undefined) data.phone = sanitizeText(payload.phone)
    if (payload.bio !== undefined) data.bio = sanitizeHtml(payload.bio)

    if (payload.isPublished !== undefined) {
      data.isPublished = typeof payload.isPublished === 'string' ? payload.isPublished === 'true' : Boolean(payload.isPublished)
    }
    return data
  },

  async _processFile(file, data) {
    const kind = await fileTypeFromFile(file.path)
    if (!kind || !kind.mime.startsWith('image/')) {
      throw new Error('Invalid image file')
    }
    
    // Optimize for WebP max 800px
    const { buffer, mimetype } = await optimizeImage(file.path, kind.mime || file.mimetype, { maxWidth: 800 })
    
    data.imageData = buffer
    data.fileName = decodeUploadFilename(file.originalname)
    data.mimeType = mimetype
    data.fileSize = buffer.length
  },

  async _processUrl(urlStr, data) {
    try {
      const response = await fetch(urlStr.trim())
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get('content-type') || 'application/octet-stream'

      let fileName = 'executive.jpg'
      try {
        const urlObj = new URL(urlStr)
        const pathParts = urlObj.pathname.split('/')
        fileName = pathParts[pathParts.length - 1] || 'executive.jpg'
      } catch { }

      const kind = await fileTypeFromBuffer(buffer)
      const finalMime = kind?.mime || contentType
      if (!finalMime.startsWith('image/')) throw new Error('Invalid image URL')
      
      data.imageData = buffer
      data.fileName = fileName
      data.mimeType = finalMime
      data.fileSize = buffer.length
    } catch (err) {
      throw new Error(`Failed to download image from URL: ${err.message}`)
    }
  }
}
