import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'

const router = Router()

// In-memory cache (5 minutes)
let cachedData = null
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 min

router.get('/', createRateLimiter({ windowMs: 60_000, max: 30 }), async (_req, res) => {
    try {
        const apiKey = process.env.DUSTBOY_API_KEY
        if (!apiKey) {
            return res.status(503).json({ success: false, error: 'DUSTBOY_API_KEY is not configured' })
        }

        // Return cached data if still fresh
        if (cachedData && Date.now() < cacheExpiry) {
            res.setHeader('X-Cache', 'HIT')
            return res.json({ success: true, data: cachedData })
        }

        const url = `https://open-api.cmuccdc.org/api/dustboy/station?apikey=${apiKey}`
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })

        if (!response.ok) {
            console.error(`[airquality] DustBoy API error: ${response.status}`)
            // Return stale cache if available
            if (cachedData) {
                res.setHeader('X-Cache', 'STALE')
                return res.json({ success: true, data: cachedData, stale: true })
            }
            return res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้' })
        }

        const data = await response.json()

        // Find Pong Hospital station (dustboy_uri = "ponghos")
        const station = Array.isArray(data)
            ? data.find(s => s.dustboy_uri === 'ponghos') || data[0]
            : data

        if (!station) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลสถานี รพ.ปง' })
        }

        // Cache the result
        cachedData = station
        cacheExpiry = Date.now() + CACHE_TTL

        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.json({ success: true, data: station })
    } catch (error) {
        console.error('[airquality] Error:', error?.message)
        // Return stale cache on error
        if (cachedData) {
            res.setHeader('X-Cache', 'STALE')
            return res.json({ success: true, data: cachedData, stale: true })
        }
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคุณภาพอากาศ' })
    }
})

export default router
