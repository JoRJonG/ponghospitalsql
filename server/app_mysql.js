import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import activitiesRouter from './routes/activities.js'
import announcementsRouter from './routes/announcements.js'
import slidesRouter from './routes/slides.js'
import unitsRouter from './routes/units.js'
import executivesRouter from './routes/executives.js'
import infographicsRouter from './routes/infographics.js'
import itaRouter from './routes/ita.js'
import authRouter from './routes/auth.js'
import imagesRouter from './routes/images.js'
import uploadsRouter from './routes/uploads.js'
import visitorsRouter from './routes/visitors.js'
import popupsRouter from './routes/popups.js'
import systemRouter from './routes/system.js'
import usersRouter from './routes/users.js'
import feedbackRouter from './routes/feedback.js'
import documentsRouter from './routes/documents.js'
import prPostersRouter from './routes/pr_posters.js'
import prPlansRouter from './routes/pr_plans.js'
import organizationRouter from './routes/organization.js'
import thaidAuthRouter from './routes/thaidAuth.js'
import airqualityRouter from './routes/airquality.js'
import legalEthicsRouter from './routes/legal_ethics.js'
import itDocumentsRouter from './routes/it_documents.js'
import { apiLimiter, createRateLimiter } from './middleware/ratelimit.js'
import { preventHpp, xssSanitizer, validateOrigin } from './middleware/security.js'
import { botBlocker } from './middleware/botBlocker.js'
import { logger } from './utils/logger.js'
import { testConnection } from './database.js'
import fs from 'fs/promises'
import Announcement from './models/mysql/Announcement.js'
import Activity from './models/mysql/ActivityBlob.js'
import './cronJobs.js' // นำเข้า cron jobs

export async function createServer() {
  dotenv.config()
  const app = express()
  app.disable('x-powered-by') // OWASP: Hide server technology
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath = path.resolve(__dirname, '../dist')

  // CORS: allow all in development; restrict in production via env ALLOWED_ORIGINS (comma-separated)
  const isDev = process.env.NODE_ENV !== 'production'
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  app.use(cors({
    origin: (origin, cb) => {
      if (isDev || !origin) return cb(null, true)
      if (allowed.length === 0) return cb(null, true) // fallback permissive if not configured
      if (allowed.includes(origin)) return cb(null, true)
      return cb(new Error('CORS blocked'), false)
    },
    credentials: true,
  }))
  // Global rate limiting to prevent abuse
  app.use(apiLimiter)
  // ยกเว้น SSE endpoints จาก compression เพราะ compression จะ buffer data ก่อน flush
  // ทำให้ EventSource ที่ browser เปิดอยู่ไม่ได้รับข้อมูลเลย (0 bytes ค้าง)
  app.use(compression({
    filter: (req, res) => {
      // ไม่ compress ถ้าเป็น SSE request (text/event-stream)
      if (req.path.includes('/stream') || req.headers.accept === 'text/event-stream') {
        return false
      }
      return compression.filter(req, res)
    }
  }))
  // Security headers with helmet
  const httpsEnabled = String(process.env.USE_HTTPS).toLowerCase() === 'true'
  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
    mediaSrc: ["'self'", "data:", "blob:"],
    frameSrc: ["'self'", "https://www.google.com"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"], // OWASP: Prevent Clickjacking
  }
  // Only ask browser to upgrade to HTTPS when HTTPS is actually enabled
  if (httpsEnabled) {
    cspDirectives.upgradeInsecureRequests = []
  }

  const helmetConfig = {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: cspDirectives,
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for PDF viewer
    originAgentCluster: httpsEnabled, // Only advertise OAC support when HTTPS is active
    hsts: httpsEnabled ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false, // OWASP: Strict Transport Security
    frameguard: { action: 'deny' }, // OWASP: Prevent Clickjacking (X-Frame-Options)
  }

  // Only enable HSTS when HTTPS is actually in use
  if (!httpsEnabled) {
    // helmetConfig.hsts = false // Already handled above
    helmetConfig.crossOriginOpenerPolicy = false
  }

  app.use(helmet(helmetConfig))
  // Trust proxy for proper protocol detection behind reverse proxy
  app.set('trust proxy', 1)

  // Body parser for JSON requests
  // ใช้ 10mb เพียงพอสำหรับ JSON ปกติ — multipart/file upload ใช้ multer per-route จัดการเอง
  app.use(express.json({ limit: '10mb' }))
  // Body parser for form data (multipart handled by multer per-route)
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Cookie parser with secret for signed cookies
  const cookieSecret = process.env.COOKIE_SECRET || 'ph-secure-secret-key-change-in-prod-v1'
  app.use(cookieParser(cookieSecret))

  // Security Middleware
  // Prevent HTTP Parameter Pollution
  app.use(preventHpp)
  // Sanitize inputs against XSS
  app.use(xssSanitizer)
  // CSRF Protection
  app.use(validateOrigin)
  // Bot/Scanner Protection
  app.use(botBlocker)

  // Global Safeguard: Request Timeout (60 seconds)
  // ป้องกัน Request ค้างนานเกินไป จนทำให้ Event Loop หรือ DB Connection ค้างตาม
  app.use((req, res, next) => {
    res.setTimeout(60000, () => {
      logger.error(`[Safeguard] Request Timeout (60s) on ${req.method} ${req.originalUrl}`)
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request Timeout', details: 'The server took too long to respond (60s limit).' })
      }
    })
    next()
  })

  // Force browser to revalidate API responses (304 support)
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache')
    next()
  })

  app.get('/api/health', async (_req, res) => {
    const dbConnected = Boolean(app.locals.dbConnected)

    let canReadAnnouncements = null
    let canReadUsers = null

    if (dbConnected) {
      try {
        const { default: Announcement } = await import('./models/mysql/Announcement.js')
        await Announcement.countDocuments({})
        canReadAnnouncements = true
      } catch (e) {
        canReadAnnouncements = false
        logger.warn('Cannot read announcements:', e.message)
      }

      try {
        const { default: User } = await import('./models/mysql/User.js')
        await User.countDocuments({})
        canReadUsers = true
      } catch (e) {
        canReadUsers = false
        logger.warn('Cannot read users:', e.message)
      }
    }

    res.json({
      ok: true,
      service: 'ponghospital-api',
      database: 'MySQL',
      time: new Date().toISOString(),
      dbConnected,
      dbName: process.env.MYSQL_DATABASE || 'ponghospital',
      permissions: {
        announcements: { read: canReadAnnouncements },
        users: { read: canReadUsers }
      },
      ready: true
    })
  })


  app.use('/api/activities', activitiesRouter)
  app.use('/api/announcements', announcementsRouter)
  app.use('/api/slides', slidesRouter)
  app.use('/api/units', unitsRouter)
  app.use('/api/executives', executivesRouter)
  app.use('/api/infographics', infographicsRouter)
  app.use('/api/ita', itaRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/auth/thaid', thaidAuthRouter)
  app.use('/api/images', imagesRouter)
  app.use('/api/uploads', uploadsRouter)
  app.use('/api/visitors', visitorsRouter)
  app.use('/api/popups', popupsRouter)
  app.use('/api/system', systemRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/feedback', feedbackRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/pr-posters', prPostersRouter)
  app.use('/api/pr-plans', prPlansRouter)
  app.use('/api/organization', organizationRouter)
  app.use('/api/airquality', airqualityRouter)
  app.use('/api/legal-ethics', legalEthicsRouter)
  app.use('/api/it-center', itDocumentsRouter)

  // Visitor tracking middleware (REMOVED: Now handled exclusively by frontend POST /api/visitors/track to prevent non-JS bots from inflating counts)
  // app.use(trackVisitors)

  // Helper to inject meta tags into index.html
  const injectMetaTags = (html, { title, description, image, url, type = 'website' }) => {
    let modified = html
    const siteName = 'โรงพยาบาลปง'
    const fullTitle = title ? `${title} | ${siteName}` : siteName
    const encodedTitle = fullTitle.replace(/"/g, '&quot;')
    const defaultDesc = 'โรงพยาบาลปง จังหวัดพะเยา ให้บริการด้านสุขภาพครบวงจรเพื่อประชาชน บริการตรวจรักษา ฉุกเฉิน 24 ชั่วโมง ข้อมูลข่าวสาร และประกาศจัดซื้อจัดจ้างอย่างเป็นทางการ'
    const finalDesc = (description || defaultDesc).replace(/<[^>]*>/g, '').trim().substring(0, 200).replace(/"/g, '&quot;')

    // Replace Title
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${encodedTitle}</title>`)
    modified = modified.replace(/<meta name="title" content="[^"]*"\s*\/?>/i, `<meta name="title" content="${encodedTitle}" />`)

    // Replace Description
    if (modified.includes('<meta name="description"')) {
      modified = modified.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${finalDesc}" />`)
    } else {
      modified = modified.replace('</head>', `  <meta name="description" content="${finalDesc}" />\n</head>`)
    }

    // Replace Canonical Link
    if (url) {
      if (modified.includes('<link rel="canonical"')) {
        modified = modified.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${url}" />`)
      } else {
        modified = modified.replace('</head>', `  <link rel="canonical" href="${url}" />\n</head>`)
      }
    }

    // Replace Open Graph Tags
    const defaultImage = 'https://ponghospital.moph.go.th/assets/logo-150x150-BEBbXnQy.png'
    const metaImage = image || defaultImage

    modified = modified.replace(/<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${type}" />`)
    modified = modified.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${encodedTitle}" />`)
    modified = modified.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${finalDesc}" />`)
    modified = modified.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${metaImage}" />`)
    if (url) {
      modified = modified.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${url}" />`)
    }

    // Replace Twitter Card Tags
    modified = modified.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${encodedTitle}" />`)
    modified = modified.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${finalDesc}" />`)
    modified = modified.replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${metaImage}" />`)
    modified = modified.replace(/<meta name="twitter:card" content="[^"]*"\s*\/?>/i, `<meta name="twitter:card" content="summary_large_image" />`)

    return modified
  }

  // Helper to check if request is from a social bot
  const isSocialBot = (userAgent) => {
    if (!userAgent) return false
    const bots = [
      'facebookexternalhit',
      'Twitterbot',
      'LINE-p2',
      'WhatsApp',
      'LinkedInBot',
      'TelegramBot',
      'Googlebot'
    ]
    const ua = userAgent.toLowerCase()
    return bots.some(bot => ua.includes(bot.toLowerCase()))
  }

  // Server-side rendering for Open Graph tags (Activities)
  app.get('/activities/:id', async (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    if (!isSocialBot(req.headers['user-agent'])) return next()
    
    try {
      const activity = await Activity.findById(req.params.id)
      if (!activity) return next()

      let html = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8')
      const title = activity.title
      const description = activity.description || ''

      let image = 'https://ponghospital.moph.go.th/assets/logo-150x150-BEBbXnQy.png'
      if (activity.images && activity.images.length > 0) {
        const firstImg = activity.images[0]
        const imgUrl = firstImg.url || firstImg
        image = imgUrl.startsWith('http') ? imgUrl : `${req.protocol}://${req.get('host')}${imgUrl}`
      }

      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
      html = injectMetaTags(html, { title, description, image, url, type: 'article' })
      res.send(html)
    } catch (e) {
      next()
    }
  })

  // Server-side rendering for Open Graph tags (Announcements)
  app.get(['/announcement/:id', '/announcements/:id'], async (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    if (!isSocialBot(req.headers['user-agent'])) return next()

    try {
      const announcement = await Announcement.findById(req.params.id)
      if (!announcement) return next()

      let html = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8')
      const title = announcement.title
      const description = announcement.content || ''

      // Find first image attachment if available
      let image = 'https://ponghospital.moph.go.th/assets/logo-150x150-BEBbXnQy.png'
      if (announcement.attachments && announcement.attachments.length > 0) {
        const imgAttachment = announcement.attachments.find(a => a.kind === 'image' || (a.name && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.name)))
        if (imgAttachment) {
          const imgUrl = imgAttachment.url
          image = imgUrl.startsWith('http') ? imgUrl : `${req.protocol}://${req.get('host')}${imgUrl}`
        }
      }

      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
      html = injectMetaTags(html, { title, description, image, url, type: 'article' })
      res.send(html)
    } catch (e) {
      logger.error(`[OG SSR Announcement] Error for ID ${req.params.id}:`, e.message)
      next()
    }
  })



  // Serve built frontend (Vite output) if present
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // ลบ X-Robots-Tag header สำหรับ sitemap.xml เพื่อให้ Google Search Console สามารถดึงข้อมูลได้
      if (filePath.endsWith('sitemap.xml')) {
        res.removeHeader('X-Robots-Tag')
        res.setHeader('Cache-Control', 'public, max-age=3600') // Cache 1 hour
      } else if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else if (filePath.includes('assets')) {
        // Hashed assets -> 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        // Other static files -> 1 day
        res.setHeader('Cache-Control', 'public, max-age=86400')
      }
    }
  }))


  // SPA fallback: send index.html for non-API GET requests (Express v5-safe)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    if (req.path.startsWith('/api')) return next()
    return res.sendFile(path.join(distPath, 'index.html'))
  })

  // Global error handler for payload issues
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Payload too large',
        details: 'Request body exceeds size limit. Please compress images before uploading.'
      })
    }
    if (err.code === 'ECONNRESET') {
      return res.status(400).json({
        error: 'Connection reset',
        details: 'Request was too large or took too long. Please try with smaller files.'
      })
    }
    const status = err.status || err.statusCode || 500
    if (status >= 500) {
      logger.error('[ERROR]', err.message)
    }
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : (err.message || 'Request failed'),
      details: err.message,
    })
  })

  // PDF proxy - รองรับเฉพาะ URL โดยตรง (ไม่ใช้ Cloudinary)
  // Add light rate limiting to avoid abuse
  app.get('/api/proxy/pdf', createRateLimiter({ windowMs: 60_000, max: 30 }), async (req, res) => {
    try {
      const url = req.query.url
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing url parameter' })
      }

      let parsed
      try {
        parsed = new URL(url)
      } catch {
        return res.status(400).json({ error: 'Invalid URL' })
      }

      if (!/^https?:$/.test(parsed.protocol)) {
        return res.status(400).json({ error: 'Only http/https protocols are allowed' })
      }

      const host = parsed.hostname.toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return res.status(403).json({ error: 'Cannot proxy localhost URLs' })
      }

      const r = await fetch(url)
      if (!r.ok) {
        return res.status(r.status).json({ error: `Upstream error ${r.status}` })
      }

      const ct = r.headers.get('content-type') || 'application/pdf'
      const len = r.headers.get('content-length')
      res.setHeader('Content-Type', ct)
      if (len) res.setHeader('Content-Length', len)
      res.setHeader('Cache-Control', 'public, max-age=300')
      // ใช้ pipe stream แทน arrayBuffer เพื่อไม่โหลดทั้งไฟล์เข้า RAM
      const { Readable } = await import('stream')
      Readable.fromWeb(r.body).pipe(res)
    } catch (e) {
      logger.error('[PDF proxy] Error:', e?.message)
      res.status(500).json({ error: 'Proxy failed', details: e?.message })
    }
  })

  // Prepare DB connect function
  const connectDb = async () => {
    let connected = false

    try {
      connected = await testConnection()

      if (connected) {
        // Seed admin user (best-effort)
        try {
          const { default: User } = await import('./models/mysql/User.js')
          const adminUser = (process.env.ADMIN_USER || 'admin').toLowerCase()
          const adminPass = process.env.ADMIN_PASS || 'admin123'

          if (adminUser && adminPass) {
            try {
              // Check if admin exists first
              const existingAdmin = await User.findOne({ username: adminUser })

              if (!existingAdmin) {
                const bcryptPkg = await import('bcryptjs')
                const { hash } = bcryptPkg.default || bcryptPkg
                const passwordHash = await hash(adminPass, 10)

                await User.create({
                  username: adminUser,
                  passwordHash,
                  roles: ['admin'],
                  permissions: ['*'],
                  isActive: true
                })
                // console.log(`[seed] Created admin user: ${adminUser}`)
              } else {
                // console.log(`[seed] Admin user already exists, skipping password reset: ${adminUser}`)
              }
            } catch (e) {
              logger.warn('[seed] Could not ensure admin user:', e?.message)
            }
          }
        } catch (e) {
          logger.warn('[seed] Skipped seeding admin user:', e?.message)
        }
      }
    } catch (err) {
      logger.warn('[WARN] Could not connect to MySQL. Continuing without DB. Error:', err?.message)
    }

    app.locals.dbConnected = connected
  }

  return { app, connectDb }
}