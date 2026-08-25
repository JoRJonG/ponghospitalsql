import PRPlan from '../models/mysql/PRPlan.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitization.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { purgeCachePrefix } from '../middleware/cache.js'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pr_plans')

const prepareUploadDir = async () => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create upload directory:', e)
  }
}

export const PRPlanService = {
  async findAll(filters) {
    const [plans, total] = await Promise.all([
      PRPlan.findAll(filters),
      PRPlan.count(filters)
    ])
    return { plans, total }
  },

  async findById(id, isAdmin = false) {
    const plan = await PRPlan.findById(id)
    if (!plan) return null
    if (!plan.is_published && !isAdmin) return null
    return plan
  },

  async getFile(id, isAdmin = false) {
    const plan = await PRPlan.findById(id)
    if (!plan) throw new Error('PR Plan not found')
    if (!plan.is_published && !isAdmin) throw new Error('PR Plan not found')

    const fileInfo = await PRPlan.getFilePath(plan.id)
    if (!fileInfo || !fileInfo.file_path) throw new Error('File not found')

    const filePath = path.join(process.cwd(), fileInfo.file_path)
    if (!existsSync(filePath)) throw new Error('File not found on server')

    return { filePath, fileInfo, planId: plan.id }
  },

  async downloadFile(id, isAdmin = false) {
    const file = await this.getFile(id, isAdmin)
    await PRPlan.incrementDownloadCount(file.planId)
    return file
  },

  async createPlan(payload, file, user) {
    if (!file) throw new Error('No file uploaded')

    try {
      let fileType = null
      try {
        fileType = await fileTypeFromFile(file.path)
      } catch (e) {
        console.warn('[pr-plans] fileTypeFromFile failed:', e?.message)
      }

      const detectedMime = fileType?.mime
      const declaredMime = file.mimetype
      const isPDF = declaredMime === 'application/pdf' || detectedMime === 'application/pdf'

      if (!isPDF) throw new Error('Invalid file type: Only PDF files are allowed')

      const sanitizedTitle = payload.title ? sanitizeText(payload.title) : ''
      const sanitizedDescription = payload.description ? sanitizeHtml(payload.description) : ''

      if (!sanitizedTitle) throw new Error('Title is required')

      await prepareUploadDir()

      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const decodedName = decodeUploadFilename(file.originalname)
      const ext = path.extname(decodedName)
      const safeFileName = `${timestamp}-${randomStr}${ext}`
      const filePath = path.join(UPLOAD_DIR, safeFileName)

      await fs.copyFile(file.path, filePath)

      const relativePath = path.join('uploads', 'pr_plans', safeFileName).replace(/\\/g, '/')

      const plan = await PRPlan.create({
        title: sanitizedTitle,
        description: sanitizedDescription,
        filePath: relativePath,
        fileName: decodedName,
        mimeType: 'application/pdf',
        fileSize: file.size,
        isPublished: payload.isPublished === 'true' || payload.isPublished === true,
        displayOrder: payload.displayOrder ? parseInt(payload.displayOrder) : 0,
        createdBy: user?.username
      })

      purgeCachePrefix('/api/pr-plans')
      return await PRPlan.findById(plan.id)
    } finally {
      await cleanTempFile(file)
    }
  },

  async updatePlan(id, payload, file, user) {
    try {
      const updateData = {}

      if (payload.title !== undefined) updateData.title = sanitizeText(payload.title)
      if (payload.description !== undefined) updateData.description = sanitizeHtml(payload.description)
      if (payload.isPublished !== undefined) updateData.isPublished = payload.isPublished === 'true' || payload.isPublished === true
      if (payload.displayOrder !== undefined) updateData.displayOrder = parseInt(payload.displayOrder)

      if (file) {
        let fileType = null
        try {
          fileType = await fileTypeFromFile(file.path)
        } catch (e) {
          console.warn('[pr-plans] fileTypeFromFile failed:', e?.message)
        }

        const detectedMime = fileType?.mime
        const declaredMime = file.mimetype
        const isPDF = declaredMime === 'application/pdf' || detectedMime === 'application/pdf'

        if (!isPDF) throw new Error('Invalid file type: Only PDF files are allowed')

        const oldPlan = await PRPlan.getFilePath(id)
        if (oldPlan && oldPlan.file_path) {
          const oldFilePath = path.join(process.cwd(), oldPlan.file_path)
          try {
            if (existsSync(oldFilePath)) await fs.unlink(oldFilePath)
          } catch (e) {
            console.warn('[pr-plans] Failed to delete old file:', e.message)
          }
        }

        await prepareUploadDir()

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const decodedName = decodeUploadFilename(file.originalname)
        const ext = path.extname(decodedName)
        const safeFileName = `${timestamp}-${randomStr}${ext}`
        const filePath = path.join(UPLOAD_DIR, safeFileName)

        await fs.copyFile(file.path, filePath)
        const relativePath = path.join('uploads', 'pr_plans', safeFileName).replace(/\\/g, '/')

        updateData.filePath = relativePath
        updateData.fileName = decodedName
        updateData.mimeType = 'application/pdf'
        updateData.fileSize = file.size
      }

      updateData.updatedBy = user?.username

      await PRPlan.findByIdAndUpdate(id, updateData)
      purgeCachePrefix('/api/pr-plans')
      
      const updatedPlan = await PRPlan.findById(id)
      if (!updatedPlan) throw new Error('PR Plan not found')
      return updatedPlan
    } finally {
      if (file) await cleanTempFile(file)
    }
  },

  async deletePlan(id) {
    const result = await PRPlan.findByIdAndDelete(id)
    if (!result) throw new Error('PR Plan not found')

    if (result.filePath) {
      const filePath = path.join(process.cwd(), result.filePath)
      try {
        if (existsSync(filePath)) await fs.unlink(filePath)
      } catch (e) {
        console.warn('[pr-plans] Failed to delete file:', e.message)
      }
    }

    purgeCachePrefix('/api/pr-plans')
    return true
  }
}
