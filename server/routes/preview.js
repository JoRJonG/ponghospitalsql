import { Router } from 'express'
import Announcement from '../models/mysql/Announcement.js'
import { Activity } from '../models/mysql/Activity.js'

const router = Router()

function stripText(html) {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Helper to render preview HTML with OG meta tags
function renderPreview({ title, description, imageUrl, canonicalUrl }) {
  const safeTitle = escapeHtml(title || '')
  const safeDesc = escapeHtml(description || '')
  const safeImage = imageUrl ? escapeHtml(imageUrl) : ''
  const safeCanonical = escapeHtml(canonicalUrl || '')

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
  <meta property="og:locale" content="th_TH" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
  ${safeCanonical ? `<link rel="canonical" href="${safeCanonical}" />` : ''}
  <!-- Redirect to SPA route after a short delay so users land on the app -->
  ${safeCanonical ? `<meta http-equiv="refresh" content="1;url=${safeCanonical}">` : ''}
</head>
<body>
  <p>${safeTitle}</p>
  <p>${safeDesc}</p>
  ${safeImage ? `<img src="${safeImage}" alt="${safeTitle}" style="max-width:100%;height:auto;display:block;margin:16px 0" />` : ''}
  ${safeCanonical ? `<p><a href="${safeCanonical}">เปิดในเว็บ</a></p>` : ''}
</body>
</html>`
}

// Announcement preview
router.get('/announcement/:id', async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      // Return a small HTML fallback
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(renderPreview({ title: 'ประกาศ', description: '', canonicalUrl: `${req.protocol}://${req.get('host')}/announcement/${req.params.id}` }))
    }

    const id = req.params.id
    const item = await Announcement.findById(id)
    if (!item) return res.status(404).send('Not found')

    const title = item.title
    const desc = stripText(item.content || '')
    const firstImage = (item.attachments && item.attachments.length) ? item.attachments[0].url : null
    const host = `${req.protocol}://${req.get('host')}`
    const imageUrl = firstImage ? (firstImage.startsWith('http') ? firstImage : `${host}${firstImage}`) : null
    const canonical = `${host}/announcement/${id}`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Allow crawlers to cache for a short while
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=86400')
    res.send(renderPreview({ title, description: desc, imageUrl, canonicalUrl: canonical }))
  } catch (e) {
    console.error('[preview] announcement error', e?.message)
    res.status(500).send('Server error')
  }
})

// Activity preview
router.get('/activity/:id', async (req, res) => {
  try {
    if (!req.app.locals.dbConnected) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(renderPreview({ title: 'กิจกรรม', description: '', canonicalUrl: `${req.protocol}://${req.get('host')}/activities/${req.params.id}` }))
    }

    const id = req.params.id
    const item = await Activity.findById(id)
    if (!item) return res.status(404).send('Not found')

    const title = item.title
    const desc = stripText(item.description || '')
    const firstImage = (item.images && item.images.length) ? (item.images[0].url || item.images[0]) : null
    const host = `${req.protocol}://${req.get('host')}`
    const imageUrl = firstImage ? (firstImage.startsWith('http') ? firstImage : `${host}${firstImage}`) : null
    const canonical = `${host}/activities/${id}`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=86400')
    res.send(renderPreview({ title, description: desc, imageUrl, canonicalUrl: canonical }))
  } catch (e) {
    console.error('[preview] activity error', e?.message)
    res.status(500).send('Server error')
  }
})

export default router
