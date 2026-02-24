import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { airQualityService } from '../services/airQualityService.js'

const router = Router()

// In-memory cache for station data (1 hour — ค่าฝุ่น PM 2.5 เป็นค่าเฉลี่ยรายชั่วโมง)
let cachedStationData = null
let cacheStationExpiry = 0

// In-memory cache for history (หมดอายุตรงต้นชั่วโมงถัดไป ตรงกับที่ DustBoy อัปเดต)
let cachedHistoryData = null
let historyCacheExpiry = 0

// คำนวณเวลา (ms) ถึงต้นชั่วโมงถัดไป เช่น ตอนนี้ 16:37 → รอ 23 นาที 0 วินาที
function msUntilNextHour() {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime() - now.getTime()
}

// Safe Throttle: Max 10 requests / hour = 1 request every 6 minutes
// We use 6.5 minutes (390,000 ms) as our absolute minimum cache lifetime to ensure we NEVER breach the rate limit.
const ABSOLUTE_MIN_TTL = 6.5 * 60 * 1000

// Promise caching (In-flight request deduplication) to prevent Cache Stampedes
const inflightPromises = {
    station: null,
    history: null
}

/**
 * Advanced Helper: Stale-While-Revalidate with Promise Deduplication
 */
async function getWithStaleFallbackAndDeduplication(fetcherFn, cacheRef, expiryRef, calculateExpiryFn, promiseRefKey, promiseRegistry) {
    const now = Date.now()
    const isCacheValid = cacheRef.data && now < expiryRef.time

    // 1. Cache HIT
    if (isCacheValid) {
        return { data: cacheRef.data, isStale: false, source: 'cache' }
    }

    // 2. Cache MISS / EXPIRED - but someone else is already fetching (Deduplication!)
    if (promiseRegistry[promiseRefKey]) {
        try {
            // Wait for the ongoing request to finish and ride its success
            const freshData = await promiseRegistry[promiseRefKey]
            return { data: freshData, isStale: false, source: 'network-dedup' }
        } catch (error) {
            // If the inflight request falls over, gracefully degrade
            if (cacheRef.data) return { data: cacheRef.data, isStale: true, source: 'stale-cache' }
            throw error
        }
    }

    // 3. Cache MISS / EXPIRED - We are the first to notice. Let's fetch!
    // Create the promise and store it in our registry so others can wait on it
    promiseRegistry[promiseRefKey] = fetcherFn()

    try {
        const freshData = await promiseRegistry[promiseRefKey]

        // Success: Update cache and set expiry
        cacheRef.data = freshData
        // We ensure that calculated expiry NEVER violates our absolute minimum limit of 6.5 minutes
        const calculatedDuration = calculateExpiryFn(freshData)
        expiryRef.time = now + Math.max(calculatedDuration, ABSOLUTE_MIN_TTL)

        return { data: freshData, isStale: false, source: 'network' }
    } catch (error) {
        console.error(`[airquality] Fetch failed, attempting graceful degradation:`, error?.message)

        // Hard failure on Auth Errors: Do NOT return stale cache if the API key is expired or invalid (401/403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error(`[airquality] Critical API Authentication Error (${error.response.status}). Clearing cache.`)
            cacheRef.data = null // Purge stale data
            throw error // Force hard crash for the UI
        }

        // Stale-While-Revalidate pattern fallback
        if (cacheRef.data) {
            // Give the stale cache another 6.5 minutes of life to stop hammering the API during an outage
            expiryRef.time = now + ABSOLUTE_MIN_TTL
            return { data: cacheRef.data, isStale: true, source: 'stale-cache' }
        }
        // No cache available, throw it forward
        throw error
    } finally {
        // Cleanup the promise so future misses will trigger a new fetch
        promiseRegistry[promiseRefKey] = null
    }
}

router.get('/', createRateLimiter({ windowMs: 60_000, max: 30 }), async (_req, res) => {
    try {
        const cacheRef = { data: cachedStationData }
        const expiryRef = { time: cacheStationExpiry }

        const calculateExpiry = (stationData) => {
            const dataTimeStr = stationData.log_datetime.replace(' ', 'T') + '+07:00'
            const dataTime = new Date(dataTimeStr).getTime()
            const ageMs = Date.now() - dataTime

            // กรณี DustBoy ค้าง ส่งข้อมูลของชั่วโมงก่อนเก่าเกิน 55 นาที
            // เราอยากกลับมาเช็คใหม่ไวๆ แต่ต้องติดเพดาน ABSOLUTE_MIN_TTL (6.5m) เพื่อขัดขวางการโดนแบน
            let cacheDuration = ageMs > 55 * 60 * 1000 ? ABSOLUTE_MIN_TTL : msUntilNextHour()
            return cacheDuration
        }

        const result = await getWithStaleFallbackAndDeduplication(
            () => airQualityService.fetchCurrentStationData(),
            cacheRef,
            expiryRef,
            calculateExpiry,
            'station',
            inflightPromises
        )

        // Sync local module state
        cachedStationData = cacheRef.data
        cacheStationExpiry = expiryRef.time

        // Translate complex source types to standard cache headers
        let cacheHeader = 'MISS'
        if (result.source === 'cache') cacheHeader = 'HIT'
        if (result.isStale) cacheHeader = 'STALE'
        if (result.source === 'network-dedup') cacheHeader = 'HIT-DEDUP'

        res.setHeader('X-Cache', cacheHeader)
        res.json({ success: true, data: result.data, stale: result.isStale })

    } catch (error) {
        console.error('[airquality] Hard failure:', error?.message)
        res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้ในขณะนี้' })
    }
})

router.get('/history', createRateLimiter({ windowMs: 60_000, max: 5 }), async (req, res) => {
    try {
        const cacheRef = { data: cachedHistoryData }
        const expiryRef = { time: historyCacheExpiry }
        const stationId = '5049'

        const calculateExpiry = (parsedData) => {
            let cacheDuration = msUntilNextHour()
            if (parsedData.value && parsedData.value.length > 0) {
                const latestTimeStr = parsedData.value[0].log_datetime.replace(' ', 'T') + '+07:00'
                const latestTimeMs = new Date(latestTimeStr).getTime()
                const ageMs = Date.now() - latestTimeMs
                if (ageMs > 55 * 60 * 1000) {
                    cacheDuration = ABSOLUTE_MIN_TTL
                }
            }
            return cacheDuration
        }

        const result = await getWithStaleFallbackAndDeduplication(
            () => airQualityService.fetchHistoryData(stationId),
            cacheRef,
            expiryRef,
            calculateExpiry,
            'history',
            inflightPromises
        )

        // Sync local module state
        cachedHistoryData = cacheRef.data
        historyCacheExpiry = expiryRef.time

        const maxAgeSeconds = Math.max(0, Math.floor((expiryRef.time - Date.now()) / 1000))

        let cacheHeader = 'MISS'
        if (result.source === 'cache') cacheHeader = 'HIT'
        if (result.isStale) cacheHeader = 'STALE'
        if (result.source === 'network-dedup') cacheHeader = 'HIT-DEDUP'

        res.setHeader('X-Cache', cacheHeader)
        if (!result.isStale) {
            res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`)
        }
        res.json({ success: true, data: result.data, stale: result.isStale })

    } catch (error) {
        console.error('[airquality] History hard failure:', error?.message)
        res.status(502).json({ success: false, error: 'ไม่สามารถดึงข้อมูลประวัติคุณภาพอากาศได้ในขณะนี้' })
    }
})

export default router
