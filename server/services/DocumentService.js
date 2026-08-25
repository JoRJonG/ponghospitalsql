import Document from '../models/mysql/Document.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { decodeUploadFilename, contentDisposition } from '../utils/filename.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents')

const prepareUploadDir = async () => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create upload directory:', e)
  }
}
prepareUploadDir()

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
]

export const DocumentService = {
  async findAll(query, isAdmin) {
    const { category, search, page = 1, limit = 20, isPublished } = query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    let isPublishedFilter
    if (isAdmin) {
      if (isPublished !== undefined) {
        isPublishedFilter = isPublished === 'true'
      } else {
        isPublishedFilter = undefined
      }
    } else {
      isPublishedFilter = true
    }

    const filters = {
      category,
      search,
      page: pageNum,
      limit: limitNum,
      isPublished: isPublishedFilter
    }

    const [docs, total] = await Promise.all([
      Document.findAll(filters),
      Document.count(filters)
    ])

    return { docs, total, pageNum, limitNum }
  },

  async getCategories() {
    return await Document.getCategories()
  },

  async findById(id, isAdmin) {
    const doc = await Document.findById(id)
    if (!doc) return null

    if (!doc.is_published && !isAdmin) {
      return null
    }

    return doc
  },

  async getDownloadInfo(id) {
    const doc = await Document.findById(id)
    if (!doc || !doc.is_published) {
      return null
    }

    const fileInfo = await Document.getFilePath(id)
    if (!fileInfo || !fileInfo.file_path) {
      return null
    }

    const filePath = path.join(process.cwd(), fileInfo.file_path)
    if (!existsSync(filePath)) {
      return null
    }

    await Document.incrementDownloadCount(id)

    return {
      filePath,
      mimeType: fileInfo.mime_type,
      fileName: fileInfo.file_name,
      contentDispositionHeader: contentDisposition('attachment', fileInfo.file_name)
    }
  },

  async createDocument(payload, file, user) {
    if (!file) throw new Error('No file uploaded')
    try {
      const { declaredMime, detectedMime } = await this.checkFileType(file)
      const isAllowed = ALLOWED_MIME_TYPES.includes(declaredMime) || ALLOWED_MIME_TYPES.includes(detectedMime)
      if (!isAllowed) {
        const err = new Error('Invalid file type')
        err.code = 'INVALID_FILE_TYPE'
        throw err
      }

      const sanitizedTitle = payload.title ? sanitizeText(payload.title) : ''
      const sanitizedCategory = payload.category ? sanitizeText(payload.category) : ''
      if (!sanitizedTitle || !sanitizedCategory) {
        throw new Error('Title and category are required')
      }

      const { relativePath, decodedName } = await this.saveFile(file)

      return await Document.create({
        title: sanitizedTitle,
        description: payload.description ? sanitizeHtml(payload.description) : '',
        category: sanitizedCategory,
        filePath: relativePath,
        fileName: decodedName,
        mimeType: declaredMime,
        fileSize: file.size,
        isPublished: payload.isPublished === 'true' || payload.isPublished === true,
        displayOrder: payload.displayOrder ? parseInt(payload.displayOrder) : 0,
        createdBy: user?.username
      })
    } finally {
      await cleanTempFile(file)
    }
  },

  async updateDocument(id, payload, file, user) {
    try {
      const updateData = {}

      if (payload.title !== undefined) updateData.title = sanitizeText(payload.title)
      if (payload.description !== undefined) updateData.description = sanitizeHtml(payload.description)
      if (payload.category !== undefined) updateData.category = sanitizeText(payload.category)
      if (payload.isPublished !== undefined) updateData.isPublished = payload.isPublished === 'true' || payload.isPublished === true
      if (payload.displayOrder !== undefined) updateData.displayOrder = parseInt(payload.displayOrder)

      if (file) {
        const { declaredMime, detectedMime } = await this.checkFileType(file)
        const isAllowed = ALLOWED_MIME_TYPES.includes(declaredMime) || ALLOWED_MIME_TYPES.includes(detectedMime)
        
        if (!isAllowed) {
          const err = new Error('Invalid file type')
          err.code = 'INVALID_FILE_TYPE'
          throw err
        }

        const oldDoc = await Document.getFilePath(id)
        if (oldDoc && oldDoc.file_path) {
          const oldFilePath = path.join(process.cwd(), oldDoc.file_path)
          try {
            if (existsSync(oldFilePath)) await fs.unlink(oldFilePath)
          } catch (e) {}
        }

        const { relativePath, decodedName } = await this.saveFile(file)
        updateData.filePath = relativePath
        updateData.fileName = decodedName
        updateData.mimeType = declaredMime
        updateData.fileSize = file.size
      }

      updateData.updatedBy = user?.username

      await Document.findByIdAndUpdate(id, updateData)
      return await Document.findById(id)
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deleteDocument(id) {
    const result = await Document.findByIdAndDelete(id)
    if (result && result.filePath) {
      const filePath = path.join(process.cwd(), result.filePath)
      try {
        if (existsSync(filePath)) await fs.unlink(filePath)
      } catch (e) {}
    }
    return result
  },

  async checkFileType(file) {
    let fileType = null
    try {
      fileType = await fileTypeFromFile(file.path)
    } catch (e) {}
    return { detectedMime: fileType?.mime, declaredMime: file.mimetype }
  },

  async saveFile(file) {
    await prepareUploadDir()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const decodedName = decodeUploadFilename(file.originalname)
    const ext = path.extname(decodedName)
    const safeFileName = `${timestamp}-${randomStr}${ext}`
    const filePath = path.join(UPLOAD_DIR, safeFileName)

    await fs.copyFile(file.path, filePath)
    const relativePath = path.join('uploads', 'documents', safeFileName).replace(/\\/g, '/')
    return { relativePath, decodedName }
  }
}
