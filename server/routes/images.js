import { Router } from 'express'
import Slide from '../models/mysql/SlideBlob.js'
import Popup from '../models/mysql/Popup.js'
import { query } from '../database.js'
import { contentDisposition } from '../utils/filename.js'

const router = Router()

function applyNoCache(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
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
    applyNoCache(res)
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
      SELECT image_data, mime_type, file_name
      FROM activity_images WHERE id = ? AND activity_id = ?
    `, [req.params.imageId, req.params.activityId])
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Image not found' })
    }
    
    const imageData = rows[0]
    res.setHeader('Content-Type', imageData.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyNoCache(res)
    res.send(imageData.image_data)
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
    res.setHeader('Content-Type', imageData.mime_type)
    res.setHeader('Content-Disposition', contentDisposition('inline', imageData.file_name))
    applyNoCache(res)
    res.send(imageData.image_data)
  } catch (error) {
    console.error('Error fetching executive image:', error)
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
    applyNoCache(res)
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
    applyNoCache(res)
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
      SELECT file_data, mime_type, file_name, kind
      FROM announcement_attachments 
      WHERE id = ? AND announcement_id = ?
    `, [req.params.attachmentId, req.params.announcementId])
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    const fileData = rows[0]
    if (!fileData.file_data) {
      return res.status(404).json({ error: 'File data not found' })
    }
    const mime = fileData.mime_type || (fileData.kind === 'pdf' ? 'application/pdf' : (fileData.kind === 'image' ? 'image/jpeg' : null)) || 'application/octet-stream'
    const kind = fileData.kind || (mime === 'application/pdf' ? 'pdf' : (mime.startsWith('image/') ? 'image' : 'file'))
    res.setHeader('Content-Type', mime)

    // ถ้าเป็น PDF ให้แสดงในหน้าเว็บ ถ้าไม่ใช่ให้ดาวน์โหลด
    const dispositionType = kind === 'pdf' || mime === 'application/pdf'
      ? 'inline'
      : (kind === 'image' || mime.startsWith('image/') ? 'inline' : 'attachment')
    res.setHeader('Content-Disposition', contentDisposition(dispositionType, fileData.file_name || 'file'))
    
  applyNoCache(res)
    res.send(fileData.file_data)
  } catch (error) {
    console.error('Error fetching announcement attachment:', error)
    res.status(500).json({ error: 'Failed to fetch file' })
  }
})

export default router