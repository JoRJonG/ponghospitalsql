import Unit from '../models/mysql/UnitBlob.js'
import { fileTypeFromFile, fileTypeFromBuffer } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import fs from 'fs/promises'
import { decodeUploadFilename } from '../utils/filename.js'
import { purgeCachePrefix } from '../middleware/cache.js'

async function fetchImageFromUrl(imageUrl) {
  const url = imageUrl.trim()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get('content-type') || 'application/octet-stream'

  let fileName = 'image.jpg'
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    fileName = pathParts[pathParts.length - 1] || 'image.jpg'
  } catch {}

  const kind = await fileTypeFromBuffer(buffer)
  const finalMime = kind?.mime || contentType
  if (!finalMime.startsWith('image/')) throw new Error('Invalid image URL')

  return { buffer, fileName, mimeType: finalMime, fileSize: buffer.length }
}

export const UnitService = {
  async getUnitList(query, canManage) {
    const { published, status, page, limit, q } = query
    let targetStatus = 'published'
    if (status && ['all', 'published', 'hidden'].includes(status)) {
      if (status === 'published' || canManage) targetStatus = status
    } else if (published === 'false' && canManage) {
      targetStatus = 'all'
    }

    const filters = { status: targetStatus }
    if (q) filters.search = q

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitVal = Math.min(parseInt(limit) || 0, 100)
    const options = { sort: { order: 1, createdAt: -1 } }
    
    if (limitVal > 0) {
      options.limit = limitVal
      options.skip = (pageNum - 1) * limitVal
    }

    const list = await Unit.find(filters, options)
    
    let total = 0
    if (limitVal > 0 && typeof Unit.countDocuments === 'function') {
      total = await Unit.countDocuments(filters)
    }

    return { list, pageNum, limitVal, total }
  },

  async getUnitById(id) {
    return await Unit.findById(id)
  },

  async createUnit(payload, file) {
    try {
      const body = { ...payload }
      const link = (body.href || body.link || body.url || '').toString().trim()
      if (link) body.href = link

      const unitData = {
        name: body.name,
        href: body.href || '',
        order: body.order || 0,
        isPublished: body.isPublished !== false
      }

      if (file) {
        const kind = await fileTypeFromFile(file.path)
        if (!kind || !kind.mime.startsWith('image/')) {
          throw new Error('Invalid image file')
        }
        unitData.imageData = await fs.readFile(file.path)
        unitData.fileName = decodeUploadFilename(file.originalname)
        unitData.mimeType = kind.mime || file.mimetype
        unitData.fileSize = file.size
      } else if (body.imageUrl) {
        const img = await fetchImageFromUrl(body.imageUrl)
        unitData.imageData = img.buffer
        unitData.fileName = img.fileName
        unitData.mimeType = img.mimeType
        unitData.fileSize = img.fileSize
      }

      const doc = await Unit.create(unitData)
      purgeCachePrefix('/api/units')
      return doc
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async updateUnit(id, payload, file) {
    try {
      const before = await Unit.findById(id)
      if (!before) throw new Error('Not found')

      const body = { ...payload }
      const link = (body.href || body.link || body.url || '').toString().trim()
      if (link) body.href = link

      const updateData = {}
      if (body.name) updateData.name = body.name
      if (body.href !== undefined) updateData.href = body.href
      if (body.order !== undefined) updateData.order = body.order
      if (body.isPublished !== undefined) updateData.isPublished = body.isPublished

      if (file) {
        const kind = await fileTypeFromFile(file.path)
        if (!kind || !kind.mime.startsWith('image/')) {
          throw new Error('Invalid image file')
        }
        updateData.imageData = await fs.readFile(file.path)
        updateData.fileName = decodeUploadFilename(file.originalname)
        updateData.mimeType = kind.mime || file.mimetype
        updateData.fileSize = file.size
      } else if (body.imageUrl) {
        const img = await fetchImageFromUrl(body.imageUrl)
        updateData.imageData = img.buffer
        updateData.fileName = img.fileName
        updateData.mimeType = img.mimeType
        updateData.fileSize = img.fileSize
      }

      const doc = await Unit.updateById(id, updateData)
      purgeCachePrefix('/api/units')
      return doc
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteUnit(id) {
    const doc = await Unit.findByIdAndDelete(id)
    if (!doc) throw new Error('Not found')
    purgeCachePrefix('/api/units')
    return doc
  }
}
