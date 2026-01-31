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

// ดึงรูปภาพจาก Slides
router.get('/slides/:id', async (req, res) => {
  try {
    const imageData = await Slide.getImageData(req.params.id)
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' })
    }

    res.setHeader('Content-Type', imageData.mime_type)
    res.setHeader('Content-Length', imageData.image_data.length)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyPublicCache(res)
    res.send(imageData.image_data)
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

    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.file_name))
    applyPublicCache(res)
    res.send(imageData)
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
    let imageBuffer = imageData.image_data
    let mimeType = imageData.mime_type

    // If image is large (> 200KB), resize properly
    if (imageBuffer.length > 200 * 1024) {
      try {
        const pipeline = sharp(imageBuffer)
        const metadata = await pipeline.metadata()
        // If wider than 800px, resize
        if (metadata.width && metadata.width > 800) {
          imageBuffer = await pipeline
            .resize(800, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer()
          mimeType = 'image/webp'
        } else if (imageBuffer.length > 500 * 1024) {
          // Just compress if still huge but dimensions refer ok
          imageBuffer = await pipeline.webp({ quality: 80 }).toBuffer()
          mimeType = 'image/webp'
        }
      } catch (e) {
        console.warn('On-the-fly image resize failed for executive:', req.params.id, e.message)
      }
    }

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyPublicCache(res)
    res.send(imageBuffer)
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
    res.setHeader('Content-Type', imageData.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.title || 'infographic'))
    applyPublicCache(res)
    res.send(imageData.image_data)
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

    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.title || 'poster'))
    applyPublicCache(res)
    res.send(imageData)
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

    res.setHeader('Content-Type', data.image_mime || 'image/webp')
    if (data.image_size) {
      res.setHeader('Content-Length', data.image_size)
    }
    res.setHeader('Content-Disposition', contentDisposition('inline', data.image_name || 'popup-image'))
    applyPublicCache(res)
    res.send(data.image_data)
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
    let fileData = row.file_data

    // If file_path exists, try reading from disk
    if (row.file_path) {
      try {
        const fullPath = path.join(UPLOAD_DIR, row.file_path)
        fileData = await fs.readFile(fullPath)
      } catch (e) {
        console.error(`[Images] Failed to read file from disk: ${row.file_path}`, e)
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

    // Determine mime type from extension
    const ext = path.extname(row.image_path).toLowerCase()
    let mimeType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
    else if (ext === '.png') mimeType = 'image/png'
    else if (ext === '.webp') mimeType = 'image/webp'
    else if (ext === '.gif') mimeType = 'image/gif'

    const fullPath = path.join(path.resolve(__dirname, '../../server/uploads/organization'), row.image_path)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return res.status(404).json({ error: 'Image file missing' })
    }

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', contentDisposition('inline', row.title || 'org-chart'))
    applyPublicCache(res)

    const fileStream = (await import('fs')).createReadStream(fullPath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Error fetching organization chart image:', error)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

export default router