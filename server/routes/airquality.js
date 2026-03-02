import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { airQualityService } from '../services/airQualityService.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Disk Cache ────────────────────────────────────────────────────────────────
const CACHE_DIR = path.resolve(__dirname, '../.cache')
const STATION_CACHE_FILE = path.join(CACHE_DIR, 'airquality_station.json')
const HISTORY_CACHE_FILE = path.join(CACHE_DIR, 'airquality_history.json')

function readDiskCache(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch { return null }
}

function writeDiskCache(filePath, data) {
    try {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
        fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
    } catch (e) {
        console.warn('[airquality] Could not write disk cache:', e?.message)
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function msUntilNextHour() {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime() - now.getTime()
}

// ─── In-memory cache (pre-warmed from disk ทันทีที่ module load) ───────────────
const stationCache = { data: null, expiry: 0 }
const historyCache = { data: null, expiry: 0 }

    ; (() => {
        const disk = readDiskCache(STATION_CACHE_FILE)
        if (disk) {
            stationCache.data = disk
            try {
                if (disk.log_datetime) {
                    const dataTimeMs = new Date(disk.log_datetime.replace(' ', 'T') + '+07:00').getTime()
                    const startOfCurrentHour = new Date()
                    startOfCurrentHour.setMinutes(0, 0, 0)

                    if (dataTimeMs >= startOfCurrentHour.getTime()) {
                        stationCache.expiry = Date.now() + msUntilNextHour()
                        console.log('[airquality] Pre-warmed from disk (current hour data).')
                        return
                    }
                }
            } catch (e) { }

            stationCache.expiry = 0  // ข้อมูลเก่า → request แรก fetch ใหม่
            console.log('[airquality] Pre-warmed station cache from disk (stale data).')
        }
    })()

// ─── Exports สำหรับ cronJobs.js ────────────────────────────────────────────────
/**
 * cronJobs.js เรียกทุกครั้งที่ดึงข้อมูลสำเร็จ
 * อัปเดต in-memory + เขียน disk cache
 */
export function updateStationCache(data) {
    stationCache.data = data
    stationCache.expiry = Date.now() + msUntilNextHour()
    writeDiskCache(STATION_CACHE_FILE, data)
}

// ─── Route: GET /api/airquality ────────────────────────────────────────────────
// Logic: cache-first — ถ้า in-memory ยังสด → ส่งทันที (ไม่ดึง DustBoy)
//         ถ้า expire → ดึง DustBoy ใหม่ → อัปเดต cache
//         ถ้า DustBoy fail → ส่งข้อมูลเก่าจาก cache (stale) แทน 502
router.get('/', createRateLimiter({ windowMs: 60_000, max: 30 }), async (_req, res) => {
    const now = Date.now()

    // 1. Cache hit
    if (stationCache.data && now < stationCache.expiry) {
        return res
            .setHeader('X-Cache', 'HIT')
            .json({ success: true, data: stationCache.data, stale: false })
    }

    // 2. Cache miss / expired → ดึง DustBoy
    try {
        const fresh = await airQualityService.fetchCurrentStationData()

        // คำนวณ expiry ตามอายุข้อมูล
        const dataTimeMs = new Date(fresh.log_datetime.replace(' ', 'T') + '+07:00').getTime()

        const startOfCurrentHour = new Date()
        startOfCurrentHour.setMinutes(0, 0, 0)

        const ttl = dataTimeMs >= startOfCurrentHour.getTime()
            ? msUntilNextHour()    // ข้อมูลของรอบชั่วโมงนี้แล้ว → รอถึงชั่วโมงหน้า
            : 6.5 * 60 * 1000      // ยังเป็นข้อมูลเก่าอยู่ → retry เร็ว

        stationCache.data = fresh
        stationCache.expiry = now + ttl
        writeDiskCache(STATION_CACHE_FILE, fresh)

        return res
            .setHeader('X-Cache', 'MISS')
            .json({ success: true, data: fresh, stale: false })

    } catch (err) {
        console.warn('[airquality] DustBoy fetch failed:', err?.message)

        // 3. Fallback → stale cache (ดีกว่า error)
        const fallback = stationCache.data || readDiskCache(STATION_CACHE_FILE)
        if (fallback) {
            stationCache.data = fallback
            stationCache.expiry = now + 6.5 * 60 * 1000  // retry ใน ~6.5 นาที
            return res
                .setHeader('X-Cache', 'STALE')
                .json({ success: true, data: fallback, stale: true })
        }

        return res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้ในขณะนี้' })
    }
})

// ─── Route: GET /api/airquality/history ───────────────────────────────────────
router.get('/history', createRateLimiter({ windowMs: 60_000, max: 5 }), async (_req, res) => {
    const now = Date.now()
    const stationId = '5049'

    // Cache hit
    if (historyCache.data && now < historyCache.expiry) {
        return res
            .setHeader('X-Cache', 'HIT')
            .json({ success: true, data: historyCache.data, stale: false })
    }

    try {
        const fresh = await airQualityService.fetchHistoryData(stationId)

        let ttl = msUntilNextHour()
        if (fresh.value?.length > 0) {
            const latestMs = new Date(fresh.value[0].log_datetime.replace(' ', 'T') + '+07:00').getTime()

            const startOfCurrentHour = new Date()
            startOfCurrentHour.setMinutes(0, 0, 0)

            if (latestMs < startOfCurrentHour.getTime()) {
                ttl = 6.5 * 60 * 1000
            }
        }

        historyCache.data = fresh
        historyCache.expiry = now + ttl
        writeDiskCache(HISTORY_CACHE_FILE, fresh)

        return res
            .setHeader('X-Cache', 'MISS')
            .setHeader('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`)
            .json({ success: true, data: fresh, stale: false })

    } catch (err) {
        console.warn('[airquality] History fetch failed:', err?.message)
        const fallback = historyCache.data || readDiskCache(HISTORY_CACHE_FILE)
        if (fallback) {
            historyCache.data = fallback
            historyCache.expiry = now + 6.5 * 60 * 1000
            return res
                .setHeader('X-Cache', 'STALE')
                .json({ success: true, data: fallback, stale: true })
        }
        return res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลประวัติคุณภาพอากาศได้ในขณะนี้' })
    }
})

export default router
