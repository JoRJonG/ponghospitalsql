import { Router } from 'express'
import Slide from '../models/mysql/SlideBlob.js'
import Popup from '../models/mysql/Popup.js'
import { query } from '../database.js'
import { contentDisposition } from '../utils/filename.js'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/announcements')

const router = Router()

function applyPublicCache(res) {
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
}

// Helper to resize image on the fly if 'w' query param is present
const resizeImage = async (buffer, widthQuery, mimeType) => {
  if (!widthQuery) return { buffer, mimeType }

  const width = parseInt(widthQuery)
  if (isNaN(width) || width <= 0 || width > 2000) return { buffer, mimeType }

  try {
    const pipeline = sharp(buffer)
    const metadata = await pipeline.metadata()

    // Don't upscale
    if (metadata.width && metadata.width <= width) return { buffer, mimeType }

    const resizedBuffer = await pipeline
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: 80 }) // Always convert to WebP for better performance
      .toBuffer()

    return { buffer: resizedBuffer, mimeType: 'image/webp' }
  } catch (e) {
    console.warn('Resize failed, returning original:', e.message)
    return { buffer, mimeType }
  }
}

// ดึงรูปภาพจาก Slides
router.get('/slides/:id', async (req, res) => {
  try {
    const imageData = await Slide.getImageData(req.params.id)
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const processed = await resizeImage(imageData.image_data, req.query.w, imageData.mime_type)

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Length', processed.buffer.length)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching slide image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Activities
router.get('/activities/:activityId/:imageId', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_data, mime_type, file_name, file_path
      FROM activity_images WHERE id = ? AND activity_id = ?
    `, [req.params.imageId, req.params.activityId])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const row = rows[0]
    let imageData = row.image_data

    // If file_path exists, try reading from disk
    if (row.file_path) {
      try {
        // Note: We need to resolve the path relative to the activities upload dir
        // Since UPLOAD_DIR in this file is set to announcements, we need to be careful.
        // Let's define ACTIVITY_UPLOAD_DIR locally or change UPLOAD_DIR to be more generic.
        // For now, let's just resolve it relative to __dirname like we did for announcements but for activities.
        const activityUploadDir = path.resolve(__dirname, '../../uploads/activities')
        const fullPath = path.join(activityUploadDir, row.file_path)
        imageData = await fs.readFile(fullPath)
      } catch (e) {
        console.error(`[Images] Failed to read activity file from disk: ${row.file_path}`, e)
        if (!imageData) {
          return res.status(404).json({ error: 'Image content missing' })
        }
      }
    }

    if (!imageData) {
      return res.status(404).json({ error: 'Image data not found' })
    }

    // Optional: Add resize support for activity images too
    const processed = await resizeImage(imageData, req.query.w, row.mime_type)

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.file_name))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching activity image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Executives
router.get('/executives/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_data, mime_type, file_name
      FROM executives WHERE id = ?
    `, [req.params.id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const imageData = rows[0]

    // Use the standard resizeImage helper which supports req.query.w
    // Default to 'image/webp' if mime_type is missing, as we convert to webp on resize anyway
    const processed = await resizeImage(
      imageData.image_data,
      req.query.w,
      imageData.mime_type || 'image/webp'
    )

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching executive image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Infographics
router.get('/infographics/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_data, mime_type, title
      FROM infographics WHERE id = ?
    `, [req.params.id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const imageData = rows[0]

    const processed = await resizeImage(
      imageData.image_data,
      req.query.w,
      imageData.mime_type || 'image/webp'
    )

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.title || 'infographic'))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching infographic image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก PR Posters
router.get('/pr-posters/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_data, mime_type, title, image_path
      FROM pr_posters WHERE id = ?
    `, [req.params.id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const row = rows[0]
    let imageData = row.image_data

    // If file_path exists, try reading from disk
    if (row.image_path) {
      try {
        const fullPath = path.join(path.resolve(__dirname, '../../uploads'), row.image_path)
        imageData = await fs.readFile(fullPath)
      } catch (e) {
        console.error(`[Images] Failed to read PR Poster file from disk: ${row.image_path}`, e)
        if (!imageData) {
          return res.status(404).json({ error: 'Image content missing' })
        }
      }
    }

    if (!imageData) {
      return res.status(404).json({ error: 'Image content missing' })
    }

    const processed = await resizeImage(imageData, req.query.w, row.mime_type)

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.title || 'poster'))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching PR poster image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Homepage Popups
router.get('/popups/:id', async (req, res) => {
  try {
    const data = await Popup.getImageData(req.params.id)
    if (!data) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const processed = await resizeImage(data.image_data, req.query.w, data.image_mime || 'image/webp')

    res.setHeader('Content-Type', processed.mimeType)
    // Content-Length will change after resize, let Express handle it or calculate from buffer
    res.setHeader('Content-Disposition', contentDisposition('inline', data.image_name || 'popup-image'))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching popup image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Units
router.get('/units/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_data, mime_type, file_name
      FROM units WHERE id = ? AND image_data IS NOT NULL
    `, [req.params.id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const imageData = rows[0]
    res.setHeader('Content-Type', imageData.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyPublicCache(res)
    res.send(imageData.image_data)
  } catch (error) {
    console.error('Error fetching unit image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// ดึงรูปภาพจาก Announcement Attachments
router.get('/announcements/:announcementId/:attachmentId', async (req, res) => {
  try {
    const rows = await query(`
      SELECT file_data, mime_type, file_name, kind, file_path
      FROM announcement_attachments 
      WHERE id = ? AND announcement_id = ?
    `, [req.params.attachmentId, req.params.announcementId])

    if (!rows[0]) {
      return res.status(404).json({ error: 'File not found' })
    }

    const row = rows[0]

    // Check if record exists but has no file content/path
    if (!row.file_data && !row.file_path) {
      console.error(`[Images] Attachment #${req.params.attachmentId} has NULL file_data and NULL file_path`)
      return res.status(404).json({ error: 'Attachment record exists but content is missing' })
    }

    let fileData = row.file_data

    // If file_path exists, try reading from disk
    if (row.file_path) {
      try {
        const fullPath = path.join(UPLOAD_DIR, row.file_path)
        fileData = await fs.readFile(fullPath)
      } catch (e) {
        console.error(`[Images] Failed to read file from disk. ID: ${row.file_name}, Path: ${path.join(UPLOAD_DIR, row.file_path)}`, e)
        // If file missing on disk and no blob data, we can't serve it
        if (!fileData) {
          return res.status(404).json({ error: 'File content missing' })
        }
      }
    }

    if (!fileData) {
      return res.status(404).json({ error: 'File data not found' })
    }

    const mime = row.mime_type || (row.kind === 'pdf' ? 'application/pdf' : (row.kind === 'image' ? 'image/jpeg' : null)) || 'application/octet-stream'
    const kind = row.kind || (mime === 'application/pdf' ? 'pdf' : (mime.startsWith('image/') ? 'image' : 'file'))
    res.setHeader('Content-Type', mime)

    // ถ้าเป็น PDF ให้แสดงในหน้าเว็บ ถ้าไม่ใช่ให้ดาวน์โหลด
    const dispositionType = kind === 'pdf' || mime === 'application/pdf'
      ? 'inline'
      : (kind === 'image' || mime.startsWith('image/') ? 'inline' : 'attachment')
    res.setHeader('Content-Disposition', contentDisposition(dispositionType, row.file_name || 'file'))

    applyPublicCache(res)
    res.send(fileData)
  } catch (error) {
    console.error('Error fetching announcement attachment:', error)
    res.status(500).json({ error: 'Failed to fetch file' })
  }
})
// ดึงรูปภาพจาก Organization Charts
router.get('/organization/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT image_path, title
      FROM organization_charts WHERE id = ?
    `, [req.params.id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const row = rows[0]

    // Determine mime type from extension (default fallback)
    const ext = path.extname(row.image_path).toLowerCase()
    let mimeType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
    else if (ext === '.png') mimeType = 'image/png'
    else if (ext === '.webp') mimeType = 'image/webp'
    else if (ext === '.gif') mimeType = 'image/gif'

    const fullPath = path.join(process.cwd(), 'uploads', 'organization', row.image_path)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return res.status(404).json({ error: 'Image file missing' })
    }

    // Read file to buffer for resizing
    const fileBuffer = await fs.readFile(fullPath)

    // Resize using helper
    const processed = await resizeImage(
      fileBuffer,
      req.query.w,
      mimeType
    )

    res.setHeader('Content-Type', processed.mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.title || 'org-chart'))
    applyPublicCache(res)
    res.send(processed.buffer)
  } catch (error) {
    console.error('Error fetching organization chart image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

export default router