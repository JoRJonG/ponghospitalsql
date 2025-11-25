import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { requireAuth } from '../middleware/auth.js'
import { exec } from '../database.js'
import crypto from 'crypto'
import { uploadLimiter } from '../middleware/ratelimit.js'
import { fileTypeFromBuffer } from 'file-type'
import { decodeUploadFilename } from '../utils/filename.js'
import { logger } from '../utils/logger.js'

const router = Router()

// Optimize image buffer using sharp
async function optimizeImage(buffer, mimetype) {
  try {
    // For GIF files, don't optimize to preserve animation
    if (mimetype === 'image/gif') {
      return buffer
    }
    
    let pipeline = sharp(buffer)
    
    // Get image info
    const metadata = await pipeline.metadata()
    
    // Resize if too large (max 1920px width, maintain aspect ratio)
    if (metadata.width > 1920) {
      pipeline = pipeline.resize(1920, null, { withoutEnlargement: true })
    }
    
    // Convert to WebP for better compression
    pipeline = pipeline.webp({ quality: 90 })
    
    return await pipeline.toBuffer()
  } catch (error) {
    // If optimization fails, return original buffer
    console.warn('Image optimization failed:', error.message)
    return buffer
  }
}
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only images and PDF files are allowed'))
    }
  }
})

// Timeout middleware for uploads
const uploadTimeout = (req, res, next) => {
  req.setTimeout(30000) // 30 second timeout
  res.setTimeout(30000)
  next()
}

// Upload image for RichTextEditor
router.post('/image', requireAuth, uploadTimeout, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    
    // Check file size first
    if (req.file.size > 20 * 1024 * 1024) { // 20MB
      return res.status(400).json({ error: 'File too large (max 20MB)' })
    }
    
    // Sniff actual type
    const kind = await fileTypeFromBuffer(req.file.buffer)
    const okMime = req.file.mimetype.startsWith('image/') && kind && kind.mime.startsWith('image/')
    if (!okMime) {
      return res.status(400).json({ error: 'Invalid image file' })
    }
    
    // Optimize image (skip for very large files to avoid timeout)
    let optimizedBuffer = req.file.buffer
    if (req.file.size < 10 * 1024 * 1024) { // Only optimize files < 10MB
      try {
        optimizedBuffer = await optimizeImage(req.file.buffer, req.file.mimetype)
      } catch (optError) {
        console.warn('Image optimization failed, using original:', optError.message)
        // Continue with original buffer
      }
    }
    
    // Generate a unique ID for this upload
    const uploadId = crypto.randomUUID()
    
    // Return as data URL
    const base64 = optimizedBuffer.toString('base64')
    const finalMimetype = req.file.mimetype === 'image/gif' ? 'image/gif' : 'image/webp'
    const dataUrl = `data:${finalMimetype};base64,${base64}`
    
    const filename = decodeUploadFilename(req.file.originalname)
    res.json({ 
      url: dataUrl,
      publicId: uploadId,
      resourceType: 'image',
      bytes: optimizedBuffer.length,
      name: filename
    })
    
    logger.info('Image uploaded', { 
      filename: req.file.originalname, 
      size: req.file.size, 
      optimized: optimizedBuffer.length,
      ip: req.ip, 
      user: req.user?.username 
    })
  } catch (e) {
    console.error('Upload error:', e)
    res.status(500).json({ error: 'Upload failed', details: e.message })
  }
})

// Upload file (PDF, etc) for announcements
router.post('/file', requireAuth, uploadTimeout, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const kind = await fileTypeFromBuffer(req.file.buffer)
    const isPdf = req.file.mimetype === 'application/pdf' || kind?.mime === 'application/pdf'
    const isImg = req.file.mimetype.startsWith('image/') && kind && kind.mime.startsWith('image/')
    if (!isPdf && !isImg) {
      return res.status(400).json({ error: 'Only images or PDFs are allowed' })
    }
    
    const uploadId = crypto.randomUUID()
    const base64 = req.file.buffer.toString('base64')
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`
    
  const filename = decodeUploadFilename(req.file.originalname)
    res.json({ 
      url: dataUrl,
      publicId: uploadId,
  resourceType: isPdf ? 'pdf' : 'file',
      bytes: req.file.size,
      name: filename
    })
    logger.info('File uploaded', { type: isPdf ? 'pdf' : 'file', filename: req.file.originalname, size: req.file.size, ip: req.ip, user: req.user?.username })
  } catch (e) {
    res.status(500).json({ error: 'Upload failed', details: e.message })
  }
})

// Delete is no longer needed for BLOB storage (will be deleted with parent record)
router.delete('/image/:publicId', requireAuth, async (req, res) => {
  // For BLOB storage, files are deleted when parent record is deleted
  res.json({ result: 'ok', message: 'BLOB files are deleted with parent records' })
})

export default router
