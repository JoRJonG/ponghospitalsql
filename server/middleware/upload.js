import multer from 'multer'
import fs from 'fs'
import path from 'path'

const tmpDir = path.join(process.cwd(), 'uploads', 'tmp')

// Ensure tmp directory exists synchronously at startup
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // Avoid path traversal issues by replacing invalid chars
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + safeName)
  }
})

// Factory for getting standard upload middleware
export const createUploadMiddleware = (options = {}) => {
  const limits = { fileSize: options.maxSize || 10 * 1024 * 1024 }
  
  let fileFilter = options.fileFilter
  
  if (options.allowedTypes === 'image') {
    fileFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true)
      } else {
        cb(new Error('Only image files are allowed'))
      }
    }
  } else if (options.allowedTypes === 'pdf') {
    fileFilter = (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true)
      } else {
        cb(new Error('Only PDF files are allowed'))
      }
    }
  }

  return multer({ storage, limits, fileFilter })
}

export const cleanTempFile = async (reqFile) => {
  if (reqFile && reqFile.path) {
    try {
      if (fs.existsSync(reqFile.path)) {
        await fs.promises.unlink(reqFile.path)
      }
    } catch (e) {
      console.warn('Failed to clean up temp file:', reqFile.path, e.message)
    }
  }
}
