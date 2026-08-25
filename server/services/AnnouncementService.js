import Announcement from '../models/mysql/Announcement.js'
import { fileTypeFromBuffer } from 'file-type'
import { normalizeFilename } from '../utils/filename.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { logger } from '../utils/logger.js'

export const AnnouncementService = {
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
        ...(query.category ? { category: query.category } : {}),
        ...(query.q ? { search: query.q } : {}),
        status: targetStatus
    }

    const [list, total] = await Promise.all([
        Announcement.find(filter, options),
        options.limit > 0 ? Announcement.countDocuments(filter) : Promise.resolve(0)
    ])

    return { list, total }
  },

  async findById(id) {
    return await Announcement.findById(id)
  },

  async incrementViewCount(id) {
    return await Announcement.incrementViewCount(id)
  },

  async createAnnouncement(payload, files, user) {
    const data = this._preparePayload(payload, user, true)
    
    // Process attachments from multipart files
    const newAttachments = this.processMultipartFiles(files)
    if (newAttachments.length > 0) {
      data.attachments = [...(data.attachments || []), ...newAttachments]
    }

    if (data.attachments && data.attachments.length > 10) {
      throw new Error('Too many attachments (max 10)')
    }

    return await Announcement.create(data)
  },

  async updateAnnouncement(id, payload, user) {
    const data = this._preparePayload(payload, user, false)
    return await Announcement.findByIdAndUpdate(id, data, { new: true })
  },

  async deleteAnnouncement(id) {
    return await Announcement.findByIdAndDelete(id)
  },

  async addAttachment(id, file) {
    let kind = null
    try { 
      kind = await fileTypeFromBuffer(file.buffer) 
    } catch (e) { 
      logger.warn('[AnnouncementService] fileTypeFromBuffer failed:', e?.message) 
    }
    
    const sniff = kind?.mime
    const declared = file.mimetype

    const isPdf = declared === 'application/pdf' || sniff === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
    const isImg = declared.startsWith('image/') && sniff && sniff.startsWith('image/')
    
    if (!isPdf && !isImg) {
      throw new Error('Only PDF or image files are allowed')
    }

    let fileName = normalizeFilename(file.originalname)
    const mimeType = isPdf ? 'application/pdf' : (kind?.mime || file.mimetype)

    return await Announcement.addAttachment(id, {
      buffer: file.buffer,
      filename: fileName,
      mimetype: mimeType,
      kind: isPdf ? 'pdf' : 'image'
    })
  },

  _preparePayload(payload, user, isCreate) {
    let data = { ...payload }
    
    if (isCreate) {
      if (user?.username) data.createdBy = user.username
    } else {
      if (user?.username) data.updatedBy = user.username
    }

    // Sanitize user inputs
    if (data.title) data.title = sanitizeText(data.title)
    if (data.content) data.content = sanitizeHtml(data.content)
    if (data.category) data.category = sanitizeText(data.category)
    
    // Validate required for create
    if (isCreate) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
        throw new Error('Title is required')
      }
      if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
        throw new Error('Category is required')
      }
    }

    return data
  },

  processMultipartFiles(files) {
    const attachments = []
    if (files && files.length > 0) {
      for (const f of files) {
        const safeName = normalizeFilename(f.originalname)
        attachments.push({ 
          tempFilePath: f.path, // Pass the path directly to DB model
          name: safeName, 
          bytes: f.size, 
          kind: f.mimetype === 'application/pdf' ? 'pdf' : 'image',
          resourceType: f.mimetype === 'application/pdf' ? 'pdf' : 'image'
        })
      }
    }
    return attachments
  }
}
