import { Router } from 'express'
import { createRateLimiter } from '../middleware/ratelimit.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ────────────────────────────────────────────────────────────────────
// URL ของ HIS ward-stat API (เก็บใน env เพื่อความปลอดภัย)
const WARD_STAT_UPSTREAM = process.env.WARD_STAT_URL

// ฟังก์ชันคำนวณรอบการอัปเดตแบบทุกๆ 10 นาทีของหน้าปัดนาฬิกา (เช่น :00, :10, :20, :30)
function getNextTenMinuteBoundary() {
  const now = new Date()
  const minutes = now.getMinutes()
  const nextBoundary = Math.floor(minutes / 10) * 10 + 10
  now.setMinutes(nextBoundary, 0, 0) // รีเซ็ตวินาทีและมิลลิวินาทีให้เป๊ะ
  return now.getTime()
}

// Upstream timeout: 8 วินาที
const FETCH_TIMEOUT_MS = 8000

// ─── Disk Cache ────────────────────────────────────────────────────────────────
const CACHE_DIR = path.resolve(__dirname, '../.cache')
const WARD_CACHE_FILE = path.join(CACHE_DIR, 'wardstat.json')

function readDiskCache() {
  try {
    return JSON.parse(fs.readFileSync(WARD_CACHE_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function writeDiskCache(data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(WARD_CACHE_FILE, JSON.stringify(data), 'utf-8')
  } catch (e) {
    console.warn('[ward-stat] Could not write disk cache:', e?.message)
  }
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
const cache = {
  data: null,
  expiry: 0,
}

// Pre-warm ล่วงหน้าจากไฟล์ (ถ้ามี) เมื่อระบบเริ่มทำงาน
;(() => {
  const disk = readDiskCache()
  if (disk) {
    cache.data = disk
    cache.expiry = 0 // ให้ดึงใหม่เมื่อถูกเรียกครั้งแรก
    console.log('[ward-stat] Pre-warmed from disk cache.')
  }
})()

// ─── Helper: fetch พร้อม timeout ──────────────────────────────────────────────
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ─── GET /api/ward-stat ────────────────────────────────────────────────────────
// Public endpoint — ไม่ต้อง login (ใช้แสดงหน้าแรก)
// Rate limit: 60 req/นาที ต่อ IP เพื่อกัน abuse
router.get(
  '/',
  createRateLimiter({ windowMs: 60_000, max: 60 }),
  async (_req, res) => {
    const now = Date.now()

    // 1. Cache HIT
    if (cache.data && now < cache.expiry) {
      return res
        .setHeader('X-Cache', 'HIT')
        .setHeader('Cache-Control', 'public, max-age=120')
        .json({
          status: 'success',
          last_update: cache.data.last_update,
          data: cache.data.ipd_summary?.wards || [], // คงไว้เพื่อไม่ให้ UI เดิมกระทบ
          ipd_summary: cache.data.ipd_summary,
          outpatient_today: cache.data.outpatient_today,
          cached: true,
        })
    }

    // 2. Cache MISS / expired → ดึงจาก HIS
    try {
      if (!WARD_STAT_UPSTREAM) throw new Error('WARD_STAT_URL is not configured')
      
      const upstream = await fetchWithTimeout(WARD_STAT_UPSTREAM, FETCH_TIMEOUT_MS)

      // รับรองว่า upstream ตอบ success
      if (upstream?.status !== 'success') {
        throw new Error('Upstream status not success')
      }

      // อัปเดต in-memory + disk cache
      cache.data = upstream
      cache.expiry = getNextTenMinuteBoundary() // หมดอายุเมื่อถึงรอบนาทีที่ :00, :10, :20 ...
      writeDiskCache(upstream)

      return res
        .setHeader('X-Cache', 'MISS')
        .setHeader('Cache-Control', 'public, max-age=120')
        .json({
          status: 'success',
          last_update: upstream.last_update,
          data: upstream.ipd_summary?.wards || [],
          ipd_summary: upstream.ipd_summary,
          outpatient_today: upstream.outpatient_today,
          cached: false,
        })
    } catch (err) {
      console.warn('[ward-stat] Upstream fetch failed:', err?.message)

      // 3. Fallback: stale cache (ดีกว่า error)
      if (cache.data) {
        return res
          .setHeader('X-Cache', 'STALE')
          .setHeader('Cache-Control', 'no-store')
          .json({
            status: 'success',
            last_update: cache.data.last_update,
            data: cache.data.ipd_summary?.wards || [],
            ipd_summary: cache.data.ipd_summary,
            outpatient_today: cache.data.outpatient_today,
            cached: true,
            stale: true,
          })
      }

      return res
        .status(502)
        .json({
          status: 'error',
          error: 'ไม่สามารถดึงข้อมูลสถิติได้ในขณะนี้',
        })
    }
  }
)

export default router
