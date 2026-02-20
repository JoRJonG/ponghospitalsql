import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'

const router = Router()

// In-memory cache for station data (1 hour — ค่าฝุ่น PM 2.5 เป็นค่าเฉลี่ยรายชั่วโมง)
let cachedData = null
let cacheExpiry = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// In-memory cache for history (1 hour — API rate limit per key)
const HISTORY_CACHE_TTL = 60 * 60 * 1000 // 1 hour

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

        // Cache the trimmed result
        const trimmedStation = {
            dustboy_name: station.dustboy_name,
            pm25: station.pm25,
            pm10: station.pm10,
            us_aqi: station.us_aqi,
            us_color: station.us_color,
            us_title: station.us_title,
            us_dustboy_icon: station.us_dustboy_icon,
            th_aqi: station.th_aqi,
            th_color: station.th_color,
            th_title: station.th_title,
            th_caption: station.th_caption,
            th_dustboy_icon: station.th_dustboy_icon,
            daily_pm25: station.daily_pm25,
            daily_pm10: station.daily_pm10,
            daily_th_aqi: station.daily_th_aqi,
            daily_th_title: station.daily_th_title,
            daily_th_color: station.daily_th_color,
            log_datetime: station.log_datetime,
            temp: station.temp,
            humid: station.humid,
            wind_speed: station.wind_speed,
            daily_wind_speed: station.daily_wind_speed
        }

        cachedData = trimmedStation
        cacheExpiry = Date.now() + CACHE_TTL

        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.json({ success: true, data: trimmedStation })
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

// Historical data (30 days) endpoint for charts
let cachedHistory = null
let historyCacheExpiry = 0

router.get('/history', createRateLimiter({ windowMs: 60_000, max: 5 }), async (req, res) => {
    try {
        const apiKey = process.env.DUSTBOY_API_KEY
        if (!apiKey) {
            return res.status(503).json({ success: false, error: 'DUSTBOY_API_KEY is not configured' })
        }

        const stationId = req.query.station || '5049' // Default to 5049 (Pong Hospital)

        if (cachedHistory && cachedHistory.stationId === stationId && Date.now() < historyCacheExpiry) {
            res.setHeader('X-Cache', 'HIT')
            return res.json({ success: true, data: cachedHistory.data })
        }

        const url = `https://open-api.cmuccdc.org/api/dustboy/data30day/${stationId}?apikey=${apiKey}`
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })

        if (!response.ok) {
            console.error(`[airquality] DustBoy History API error: ${response.status}`)
            if (cachedHistory && cachedHistory.stationId === stationId) {
                res.setHeader('X-Cache', 'STALE')
                return res.json({ success: true, data: cachedHistory.data, stale: true })
            }
            return res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลประวัติคุณภาพอากาศได้' })
        }

        const data = await response.json()

        // Trim the history data to only include necessary fields for the current day
        const trimmedData = data
        if (trimmedData && Array.isArray(trimmedData.value) && trimmedData.value.length > 0) {
            // Get the date of the most recent record (index 0)
            const latestDate = trimmedData.value[0].log_datetime.split(' ')[0]

            // Filter records to only include data from that specific day
            const todaysRecords = trimmedData.value.filter(item => item.log_datetime.startsWith(latestDate))

            trimmedData.value = todaysRecords.map(item => ({
                log_datetime: item.log_datetime,
                pm25: item.pm25
            }))
        }

        cachedHistory = { stationId, data: trimmedData }
        historyCacheExpiry = Date.now() + HISTORY_CACHE_TTL

        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', 'public, max-age=3600') // 1 hour
        res.json({ success: true, data: trimmedData })
    } catch (error) {
        console.error('[airquality] History Error:', error?.message)
        if (cachedHistory && cachedHistory.stationId === req.query.station) {
            res.setHeader('X-Cache', 'STALE')
            return res.json({ success: true, data: cachedHistory.data, stale: true })
        }
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติคุณภาพอากาศ' })
    }
})

export default router
