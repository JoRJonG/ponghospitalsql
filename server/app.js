import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'

import activitiesRouter from './routes/activities.js'
import announcementsRouter from './routes/announcements.js'
import uploadsRouter from './routes/uploads.js'
import slidesRouter from './routes/slides.js'
import unitsRouter from './routes/units.js'
import authRouter from './routes/auth.js'
import { optionalAuth } from './middleware/auth.js'

export async function createServer() {
  dotenv.config()
  const app = express()

  app.use(cors({ origin: true, credentials: false }))
  app.use(compression())
  app.use(express.json({ limit: '5mb' }))
  app.use(optionalAuth)

  // Security headers (helmet-lite)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
    // HSTS (only relevant when served over HTTPS)
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
    // Content Security Policy suitable for API/json + image/PDF proxy
    try {
      const imgExtra = 'https://images.unsplash.com'
      const csp = [
        "default-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'self'",
        // Allow front-end to fetch this API from anywhere (often different origin)
        "connect-src *",
        // Allow images from self, data/blob, Unsplash
        `img-src 'self' data: blob: ${imgExtra}`,
        // Allow media from self
        `media-src 'self' data: blob:`,
        // Frontend styles are not served here, but allow inline for safety in any HTML responses
        "style-src 'self' 'unsafe-inline'",
        // No scripts expected from API responses
        "script-src 'self'",
      ].join('; ')
      res.setHeader('Content-Security-Policy', csp)
    } catch {}
    next()
  })

  app.get('/api/health', async (_req, res) => {
    const dbConnected = Boolean(app.locals.dbConnected)
    const cloudinaryConfigured = false // Cloudinary removed
    let canReadAnnouncements = null
    let canReadUsers = null
    if (dbConnected) {
      try {
        const { default: Announcement } = await import('./models/Announcement.js')
        await Announcement.countDocuments({}).catch((e) => { throw e })
        canReadAnnouncements = true
      } catch (e) {
        const msg = String(e?.message || '')
        if (/not allowed to do action \[find\]/i.test(msg)) canReadAnnouncements = false
      }
      try {
        const { default: User } = await import('./models/User.js')
        await User.countDocuments({}).catch((e) => { throw e })
        canReadUsers = true
      } catch (e) {
        const msg = String(e?.message || '')
        if (/not allowed to do action \[find\]/i.test(msg)) canReadUsers = false
      }
    }
    res.json({
      ok: true,
      service: 'ponghospital-api',
      time: new Date().toISOString(),
      dbConnected,
      dbName: process.env.MONGODB_DBNAME || 'ponghospital',
      permissions: { announcements: { read: canReadAnnouncements }, users: { read: canReadUsers } },
      cloudinaryConfigured,
    })
  })

  app.use('/api/activities', activitiesRouter)
  app.use('/api/announcements', announcementsRouter)
  app.use('/api/uploads', uploadsRouter)
  app.use('/api/slides', slidesRouter)
  app.use('/api/units', unitsRouter)
  app.use('/api/auth', authRouter)

  // PDF proxy stays the same
  app.get('/api/proxy/pdf', async (req, res) => {
    try {
      let url = req.query.url
      const publicId = req.query.publicId
      const forcePdf = req.query.forcePdf === '1'
      const candidates = []
      if (typeof publicId === 'string') {
        // Cloudinary removed - publicId no longer supported
        return res.status(400).json({ error: 'Cloudinary publicId not supported' })
      }
      if (typeof url === 'string') candidates.push(url)
      if (!candidates.length) return res.status(400).json({ error: 'Missing url' })
      let lastStatus = 502
      for (const candidate of candidates) {
        try {
          let parsed
          try { parsed = new URL(candidate) } catch { continue }
          if (!/^https?:$/.test(parsed.protocol)) continue
          const host = parsed.hostname.toLowerCase()
          if (host === 'localhost' || host === '127.0.0.1' || host === '::1') continue
          const r = await fetch(candidate)
          lastStatus = r.status
          if (!r.ok) continue
          const ct = r.headers.get('content-type') || 'application/pdf'
          const len = r.headers.get('content-length')
          res.setHeader('Content-Type', ct)
          if (len) res.setHeader('Content-Length', len)
          res.setHeader('Cache-Control', 'public, max-age=300')
          const ab = await r.arrayBuffer()
          return res.send(Buffer.from(ab))
        } catch (e) {}
      }
      return res.status(lastStatus || 502).json({ error: `Upstream error ${lastStatus || 'unknown'}` })
    } catch (e) {
      res.status(500).json({ error: 'Proxy failed', details: e?.message })
    }
  })

  // Prepare DB connect function
  const MONGODB_URI = process.env.MONGODB_URI || ''
  const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'ponghospital'

  const connectDb = async () => {
    let connected = false
    if (!MONGODB_URI) {
      console.warn('[WARN] MONGODB_URI not set. API will start but DB operations will fail until configured')
    } else {
      try {
        mongoose.set('bufferCommands', false)
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000, dbName: MONGODB_DBNAME })
        connected = true
        // console.log('Connected to MongoDB')
        // Seed admin (best-effort)
        try {
          const { default: User } = await import('./models/User.js')
          const adminUser = (process.env.ADMIN_USER || 'admin').toLowerCase()
          const adminPass = process.env.ADMIN_PASS || '1234'
          if (adminUser && adminPass) {
            try {
              const bcryptPkg = await import('bcryptjs')
              const { hash } = bcryptPkg.default || bcryptPkg
              const passwordHash = await hash(adminPass, 10)
              const r = await User.updateOne(
                { username: adminUser },
                { $set: { username: adminUser, passwordHash, roles: ['admin'] } },
                { upsert: true }
              )
              if (r.upsertedCount) {} // console.log(`[seed] Upserted admin user: ${adminUser} (created)`) 
              else if (r.modifiedCount) {} // console.log(`[seed] Upserted admin user: ${adminUser} (updated password/roles)`) 
              else {} // console.log(`[seed] Admin user already up-to-date: ${adminUser}`)
              try { await User.collection.createIndex({ username: 1 }, { unique: true }) } catch {}
            } catch (e) { console.warn('[seed] Could not upsert admin user:', e?.message) }
          }
        } catch (e) { console.warn('[seed] Skipped seeding admin user:', e?.message) }
      } catch (err) {
        console.warn('[WARN] Could not connect to MongoDB. Continuing without DB. Error:', err?.message)
      }
    }
    app.locals.dbConnected = connected
  }

  return { app, connectDb }
}
