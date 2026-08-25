import Popup from '../models/mysql/Popup.js'
import { optimizeImage } from '../utils/imageOptimizer.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { parseToLocalSql } from '../utils/date.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { purgeCachePrefix } from '../middleware/cache.js'

const truthyPattern = /^(1|true|yes|on)$/i

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return truthyPattern.test(String(value).trim())
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return num
}

export const PopupService = {
  async getActivePopups() {
    return await Popup.findActive()
  },

  async getAllPopups() {
    return await Popup.findAll()
  },

  async createPopup(body, file) {
    try {
      const payload = await this.buildPayload(body, file)
      const created = await Popup.create(payload)
      purgeCachePrefix('/api/popups')
      return created
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async updatePopup(id, body, file) {
    try {
      const payload = await this.buildPayload(body, file)
      const updated = await Popup.updateById(id, payload)
      if (!updated) {
        throw new Error('ไม่พบป๊อปอัป')
      }
      purgeCachePrefix('/api/popups')
      return updated
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deletePopup(id) {
    const removed = await Popup.deleteById(id)
    if (!removed) {
      throw new Error('ไม่พบป๊อปอัป')
    }
    purgeCachePrefix('/api/popups')
    return removed
  },

  async buildPayload(body, file) {
    const payload = {
      title: body.title ? String(body.title) : '',
      body: body.body ? String(body.body) : '',
      startAt: parseToLocalSql(body.startAt ?? body.start_at),
      endAt: parseToLocalSql(body.endAt ?? body.end_at),
      dismissForDays: Math.max(0, Math.floor(parseNumber(body.dismissForDays ?? body.dismiss_for_days, 1))),
      isActive: parseBoolean(body.isActive ?? body.is_active, true),
      ctaLabel: (body.ctaLabel ?? body.cta_label) ? String(body.ctaLabel ?? body.cta_label).trim() : null,
      ctaUrl: (body.ctaUrl ?? body.cta_url) ? String(body.ctaUrl ?? body.cta_url).trim() : null,
      imageUrl: (body.imageUrl ?? body.image_url) !== undefined ? (String(body.imageUrl ?? body.image_url).trim() || null) : undefined,
      clearImage: parseBoolean(body.removeImage ?? body.remove_image ?? false)
    }

    if (!payload.title.trim()) {
      throw new Error('กรุณาระบุหัวข้อป๊อปอัป')
    }
    if (!payload.body.trim()) {
      throw new Error('กรุณาระบุรายละเอียด')
    }

    if (file) {
      const detected = await fileTypeFromFile(file.path)
      if (!file.mimetype.startsWith('image/')) {
        throw new Error('ไฟล์รูปภาพไม่ถูกต้อง')
      }

      if (detected && !detected.mime.startsWith('image/')) {
        throw new Error('ไฟล์รูปภาพไม่ถูกต้อง')
      }

      const sourceMime = detected?.mime || file.mimetype
      const { buffer, mimetype } = await optimizeImage(file.path, sourceMime, { maxWidth: 1600 })
      payload.imageData = buffer
      payload.imageMime = mimetype
      payload.imageName = decodeUploadFilename(file.originalname)
      payload.imageSize = buffer.length
      payload.imageUrl = null // stored blob takes precedence
      payload.clearImage = false
    }

    if (payload.clearImage && file) {
      payload.clearImage = false
    }

    return payload
  }
}
