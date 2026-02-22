import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'

const router = Router()

// In-memory cache for station data (1 hour — ค่าฝุ่น PM 2.5 เป็นค่าเฉลี่ยรายชั่วโมง)
let cachedData = null
let cacheExpiry = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// In-memory cache for history (หมดอายุตรงต้นชั่วโมงถัดไป ตรงกับที่ DustBoy อัปเดต)

// คำนวณเวลา (ms) ถึงต้นชั่วโมงถัดไป เช่น ตอนนี้ 16:37 → รอ 23 นาที 0 วินาที
function msUntilNextHour() {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime() - now.getTime()
}

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

        const dataTimeStr = station.log_datetime.replace(' ', 'T') + '+07:00'
        const dataTime = new Date(dataTimeStr).getTime()
        const ageMs = Date.now() - dataTime

        // สาเหตุที่ต้องตรวจสอบ ageMs: บางครั้ง DustBoy อัปเดตข้อมูลช้า (เช่น 19:05 เพิ่งปล่อยข้อมูลของ 19:00)
        // ถ้าเราไปดึงตอน 19:01 ข้อมูลจะยังเป็นของ 18:00 และถ้ารอถึงรอบถัดไป ผู้ใช้จะเห็นข้อมูลเก่าไปจนถึง 20:00
        // ดังนั้น ถ้าข้อมูลเก่ากว่า 55 นาที ให้แคชแค่ 5 นาทีเพื่อวนกลับมาตรวจสอบใหม่
        let cacheDuration = ageMs > 55 * 60 * 1000 ? 5 * 60 * 1000 : msUntilNextHour()
        cacheDuration = Math.min(Math.max(cacheDuration, 60 * 1000), msUntilNextHour())

        cachedData = trimmedStation
        cacheExpiry = Date.now() + cacheDuration

        const maxAgeSeconds = Math.floor(cacheDuration / 1000) // browser cache ตรงกับ server cache
        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`)
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

        const stationId = '5049' // รหัสสถานี รพ.ปง (fixed)

        if (cachedHistory && Date.now() < historyCacheExpiry) {
            res.setHeader('X-Cache', 'HIT')
            return res.json({ success: true, data: cachedHistory })
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

        // สร้าง Object ใหม่เพื่อทิ้งข้อมูลที่ไม่จำเป็นไปทั้งหมด (Metadata อื่นๆ ของ DustBoy)
        let parsedData = { value: [] }

        if (data && Array.isArray(data.value) && data.value.length > 0) {
            // หาเวลาของ record ล่าสุด (index 0 = ใหม่ที่สุด)
            // บวกเวลาเพิ่มไปอีก 1 ชั่วโมงให้ตรงกับการแสดงผลจริงบนหน้าเว็บ
            const latestTimeStr = data.value[0].log_datetime.replace(' ', 'T') + '+07:00'
            const latestTimeMs = new Date(latestTimeStr).getTime() + (60 * 60 * 1000)
            const cutoffTimeMs = latestTimeMs - 24 * 60 * 60 * 1000 // ย้อนหลัง 24 ชม. จากเวลาที่บวกแล้ว

            // กรองและเลือกเฉพาะ 2 ฟิลด์ที่ใช้ใน Frontend
            const last24hRecords = data.value.filter(item => {
                // บวกเวลาของแต่ละ item ที่จะ filter ด้วยเช่นกัน (1 ชั่วโมง)
                const itemTimeMs = new Date(item.log_datetime.replace(' ', 'T') + '+07:00').getTime() + (60 * 60 * 1000)
                return itemTimeMs >= cutoffTimeMs
            })

            parsedData.value = last24hRecords.map(item => ({
                log_datetime: item.log_datetime,
                pm25: item.pm25
            }))
        }

        let cacheDuration = msUntilNextHour()
        if (parsedData.value.length > 0) {
            const latestTimeStr = parsedData.value[0].log_datetime.replace(' ', 'T') + '+07:00'
            const latestTimeMs = new Date(latestTimeStr).getTime()
            const ageMs = Date.now() - latestTimeMs
            // ตรวจสอบข้อมูลเก่าเหมือนกับ station เพื่อไม่ให้แคชข้อมูลเก่าจนข้ามชั่วโมง
            if (ageMs > 55 * 60 * 1000) {
                cacheDuration = 5 * 60 * 1000
            }
        }
        cacheDuration = Math.min(Math.max(cacheDuration, 60 * 1000), msUntilNextHour())

        cachedHistory = parsedData
        historyCacheExpiry = Date.now() + cacheDuration

        const maxAgeSeconds = Math.floor(cacheDuration / 1000)
        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`)
        res.json({ success: true, data: parsedData })
    } catch (error) {
        console.error('[airquality] History Error:', error?.message)
        if (cachedHistory) {
            res.setHeader('X-Cache', 'STALE')
            return res.json({ success: true, data: cachedHistory, stale: true })
        }
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติคุณภาพอากาศ' })
    }
})

export default router
