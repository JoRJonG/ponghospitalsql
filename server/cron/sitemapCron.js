import { query } from '../database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteUrl = 'https://ponghospital.moph.go.th'

function formatDateISO(dateStr) {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

export async function generateSitemap() {
  try {
    const today = new Date().toISOString()

    // 1. Static Pages Definition
    const staticPages = [
      { loc: `${siteUrl}/`, priority: '1.00', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/announcements`, priority: '0.90', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/announcements/jobs`, priority: '0.85', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/announcements/news`, priority: '0.85', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/announcements/notices`, priority: '0.85', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/announcements/procurement`, priority: '0.85', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/management`, priority: '0.80', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/ita`, priority: '0.80', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/about`, priority: '0.80', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/about/infographic`, priority: '0.75', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/contact`, priority: '0.80', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/activities`, priority: '0.70', changefreq: 'weekly', lastmod: today },
      { loc: `${siteUrl}/documents`, priority: '0.75', changefreq: 'weekly', lastmod: today },

      { loc: `${siteUrl}/air-quality`, priority: '0.80', changefreq: 'hourly', lastmod: today },
      { loc: `${siteUrl}/it-center`, priority: '0.75', changefreq: 'monthly', lastmod: today }
    ]

    let dynamicUrls = []

    // 2. Fetch Announcements
    try {
      const announcements = await query(`
        SELECT id, updated_at, published_at 
        FROM announcements 
        WHERE is_published = 1 AND (published_at IS NULL OR published_at <= NOW()) 
        ORDER BY id DESC
      `)
      for (const item of announcements) {
        dynamicUrls.push({
          loc: `${siteUrl}/announcements/${item.id}`,
          priority: '0.80',
          changefreq: 'weekly',
          lastmod: formatDateISO(item.updated_at || item.published_at)
        })
      }
    } catch (e) {
      logger.warn('[SitemapCron] Could not fetch announcements for sitemap:', e.message)
    }

    // 3. Fetch Activities
    try {
      const activities = await query(`
        SELECT id, updated_at, created_at 
        FROM activities 
        WHERE is_published = 1 
        ORDER BY id DESC
      `)
      for (const item of activities) {
        dynamicUrls.push({
          loc: `${siteUrl}/activities/${item.id}`,
          priority: '0.70',
          changefreq: 'weekly',
          lastmod: formatDateISO(item.updated_at || item.created_at)
        })
      }
    } catch (e) {
      logger.warn('[SitemapCron] Could not fetch activities for sitemap:', e.message)
    }





    // Combine static and dynamic entries
    const allEntries = [...staticPages, ...dynamicUrls]

    // Construct XML string
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allEntries.map(entry => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    // Write to public/sitemap.xml
    const publicSitemapPath = path.resolve(__dirname, '../../public/sitemap.xml')
    await fs.writeFile(publicSitemapPath, xmlContent, 'utf-8')

    // Also write to dist/sitemap.xml if dist directory exists
    const distSitemapPath = path.resolve(__dirname, '../../dist/sitemap.xml')
    try {
      await fs.writeFile(distSitemapPath, xmlContent, 'utf-8')
    } catch (e) {
      // dist folder might not exist yet before build, fine to skip
    }

    console.log(`[Cron] 🗺️ Dynamic Sitemap.xml updated successfully (${allEntries.length} total URLs)`)
  } catch (error) {
    console.error('[Cron] ❌ Failed to generate sitemap:', error?.message)
  }
}
