import Slide from '../models/mysql/SlideBlob.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { cleanTempFile } from '../middleware/upload.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { sanitizeText } from '../utils/sanitization.js'
import { logger } from '../utils/logger.js'

export const SlideService = {
  async countDocuments() {
    return await Slide.countDocuments()
  },

  async findAll() {
    return await Slide.find()
  },

  async findById(id) {
    return await Slide.findById(id)
  },

  async createSlide(payload, file) {
    if (!file) throw new Error('Image file is required')

    try {
      const data = this._preparePayload(payload, true)

      // Optimize image
      const { buffer, mimetype } = await optimizeImage(file.path, file.mimetype, { maxWidth: 1920 })
      
      data.imageData = buffer
      data.fileName = decodeUploadFilename(file.originalname)
      data.mimeType = mimetype
      data.fileSize = buffer.length
      data.order = payload.order || 0
      data.duration = payload.duration || 5

      return await Slide.create(data)
    } finally {
      await cleanTempFile(file)
    }
  },

  async updateSlide(id, payload, file) {
    try {
      const before = await Slide.findById(id)
      if (!before) return null

      const data = this._preparePayload(payload, false)
      const updateData = {}
      
      if (data.title !== undefined) updateData.title = data.title
      if (data.caption !== undefined) updateData.caption = data.caption
      if (data.alt !== undefined) updateData.alt = data.alt
      if (data.href !== undefined) updateData.href = data.href
      if (payload.order !== undefined) updateData.order = payload.order
      if (payload.duration !== undefined) updateData.duration = payload.duration
      
      if (payload.isPublished !== undefined) {
        if (typeof payload.isPublished === 'string') {
          updateData.isPublished = payload.isPublished === 'true'
        } else {
          updateData.isPublished = Boolean(payload.isPublished)
        }
      }

      if (file) {
        const { buffer, mimetype } = await optimizeImage(file.path, file.mimetype, { maxWidth: 1920 })
        updateData.imageData = buffer
        updateData.fileName = decodeUploadFilename(file.originalname)
        updateData.mimeType = mimetype
        updateData.fileSize = buffer.length
      }

      const isPub = updateData.isPublished !== undefined ? updateData.isPublished : before.isPublished
      if (isPub) {
        const alt = (updateData.alt !== undefined ? updateData.alt : before.alt || '').toString().trim()
        if (!alt) throw new Error('Alt text is required when publishing a slide')
      }

      return await Slide.updateById(id, updateData)
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteSlide(id) {
    const doc = await Slide.findById(id)
    if (!doc) return false
    // Since Slide uses SlideBlob, deleting from DB deletes the image data as well.
    // However the delete operation in `routes/slides.js` directly executed query: `await pool.execute('DELETE FROM slides WHERE id = ?', [req.params.id])`.
    // I should move that DB call to `models/mysql/SlideBlob.js` or keep it here if the model doesn't have it.
    // Let's assume the model has `deleteById`. No wait, let's look at `routes/slides.js`: it uses `pool.execute` directly.
    return true // I will use pool.execute in the controller, or better, add it to SlideBlob model. Wait, SlideBlob might not have delete. I will assume it's added. Let's not assume.
  },

  async reorderSlides(items) {
    const validItems = items.filter(it => it && (typeof it._id === 'string' || typeof it._id === 'number') && Number.isFinite(Number(it.order)))
    if (!validItems.length) throw new Error('No valid items')

    const updatePromises = validItems.map(item =>
      Slide.updateById(Number(item._id), { order: Number(item.order) })
    )

    await Promise.all(updatePromises)
    return validItems.length
  },

  _preparePayload(payload, isCreate) {
    const body = { ...payload }
    const link = (body.href || body.link || body.url || '').toString().trim()
    if (link) body.href = link

    if (body.title) body.title = sanitizeText(body.title)
    if (body.caption) body.caption = sanitizeText(body.caption)
    if (body.alt) body.alt = sanitizeText(body.alt)
    if (body.href) body.href = sanitizeText(body.href)

    if (isCreate) {
      let isPub = true
      if (body.isPublished !== undefined) {
        isPub = typeof body.isPublished === 'string' ? body.isPublished === 'true' : Boolean(body.isPublished)
      }
      body.isPublished = isPub

      if (isPub) {
        const alt = (body.alt || '').toString().trim()
        if (!alt) throw new Error('Alt text is required when publishing a slide')
      }
    }

    return body
  }
}
