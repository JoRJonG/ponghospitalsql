// server/cronJobs.js
import cron from 'node-cron'
import { query, exec } from './database.js'
import { Visitor } from './models/mysql/Visitor.js'
import { toLocalSql } from './utils/date.js'
import { purgeCachePrefix } from './middleware/cache.js'

// ฟังก์ชันลบประกาศเก่ากว่า 2 ปี
async function deleteOldAnnouncements() {
  try {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    // ลบประกาศและไฟล์แนบ
    const sql = `
      DELETE a, att
      FROM announcements a
      LEFT JOIN announcement_attachments att ON a.id = att.announcement_id
      WHERE a.created_at < ?
    `
    const result = await exec(sql, [toLocalSql(twoYearsAgo)])

    console.log(`[Cron] ลบประกาศเก่าแล้ว ${result.affectedRows} รายการ (รวมไฟล์แนบ)`)
  } catch (error) {
    console.error('[Cron] ลบประกาศล้มเหลว:', error)
  }
}

// ฟังก์ชันปิดการใช้งานป๊อปอัปที่หมดอายุแล้ว
async function disableExpiredPopups() {
  try {
    // อัปเดต is_active = 0 สำหรับรายการที่ end_at น้อยกว่าเวลาปัจจุบัน และยังเปิดใช้งานอยู่
    const sql = `
      UPDATE homepage_popups 
      SET is_active = 0 
      WHERE is_active = 1 AND end_at < NOW()
    `
    const result = await exec(sql)

    if (result.affectedRows > 0) {
      console.log(`[Cron] ปิดป๊อปอัปหมดอายุแล้ว ${result.affectedRows} รายการ`)
      // ล้าง Cache เพื่อให้หน้าเว็บแสดงผลถูกต้องทันที
      purgeCachePrefix('/api/popups')
    }
  } catch (error) {
    console.error('[Cron] ปิดป๊อปอัปหมดอายุล้มเหลว:', error)
  }
}

// รันทุกวันตอนเที่ยงคืน (00:00)
cron.schedule('0 0 * * *', () => {
  deleteOldAnnouncements()
  disableExpiredPopups()
})

console.log('[Cron] ระบบลบประกาศและปิดป๊อปอัปอัตโนมัติเริ่มทำงานแล้ว (รันทุกวัน 00:00)')

// รันทุกวัน 00:30 เพื่อล้างข้อมูลผู้เข้าชมเก่า (เก็บไว้ 90 วัน)
cron.schedule('30 0 * * *', async () => {
  try {
    await Visitor.cleanupOldVisits()
    console.log('[Cron] ลบข้อมูลผู้เข้าชมเก่าที่เกิน 90 วันแล้ว')
  } catch (error) {
    console.error('[Cron] ลบข้อมูลผู้เข้าชมล้มเหลว:', error)
  }
})

// ─── Air Quality Proactive Fetch ──────────────────────────────────────────────
// ดึงข้อมูล DustBoy ทุกชั่วโมงที่นาทีที่ 7 แล้วเขียนลง disk cache
// เมื่อ browser poll GET /api/airquality จะได้ข้อมูลใหม่ทันที
let airQualityRetryTimer = null

async function fetchAndUpdateAirQualityCache() {
  const { airQualityService } = await import('./services/airQualityService.js')
  const { updateStationCache } = await import('./routes/airquality.js')

  console.log('[AirQuality Cron] Fetching station from DustBoy...')

  try {
    const data = await airQualityService.fetchCurrentStationData()

    // เช็คว่าได้ข้อมูลชั่วโมงปัจจุบันหรือยัง
    const dataTimeStr = data.log_datetime.replace(' ', 'T') + '+07:00'
    const dataTimeMs = new Date(dataTimeStr).getTime()
    const startOfCurrentHour = new Date()
    startOfCurrentHour.setMinutes(0, 0, 0)
    const hasCurrentHourData = dataTimeMs >= startOfCurrentHour.getTime()

    // อัปเดต in-memory + disk cache เสมอ
    updateStationCache(data)
    console.log(`[AirQuality Cron] Station cache updated. Current hour data: ${hasCurrentHourData}`)

    if (!hasCurrentHourData) {
      // ยังได้ข้อมูลเก่า → retry อีก 3 นาที
      const dataHour = new Date(dataTimeStr).getHours()
      console.warn(`[AirQuality Cron] Got stale data (hour ${dataHour}). Retrying in 3 min...`)

      if (!airQualityRetryTimer) {
        airQualityRetryTimer = setTimeout(async () => {
          airQualityRetryTimer = null
          await fetchAndUpdateAirQualityCache()
        }, 3 * 60 * 1000)
      }
    } else if (airQualityRetryTimer) {
      clearTimeout(airQualityRetryTimer)
      airQualityRetryTimer = null
    }

  } catch (error) {
    console.error('[AirQuality Cron] Station fetch failed:', error?.message)
    // ไม่ retry — disk cache ยังมีข้อมูลเก่าให้ browser ดึงได้อยู่
  }
}

let airQualityHistoryRetryTimer = null

async function fetchAndUpdateAirQualityHistoryCache() {
  const { airQualityService } = await import('./services/airQualityService.js')
  const { updateHistoryCache } = await import('./routes/airquality.js')

  console.log('[AirQuality Cron] Fetching history from DustBoy...')

  try {
    const data = await airQualityService.fetchHistoryData('5049')

    // ตรวจสอบว่า record ล่าสุด (index 0) เป็นของชั่วโมงปัจจุบันหรือยัง
    let hasCurrentHourData = false
    if (data && data.value && data.value.length > 0) {
      const latestTimeStr = data.value[0].log_datetime.replace(' ', 'T') + '+07:00'
      const latestTimeMs = new Date(latestTimeStr).getTime()
      const startOfCurrentHour = new Date()
      startOfCurrentHour.setMinutes(0, 0, 0)
      hasCurrentHourData = latestTimeMs >= startOfCurrentHour.getTime()
    }

    updateHistoryCache(data)
    console.log(`[AirQuality Cron] History cache updated. Current hour data: ${hasCurrentHourData}. Records: ${data.value?.length ?? 0}`)

    if (!hasCurrentHourData) {
      // ยังได้ข้อมูลเก่า → retry อีก 3 นาที
      console.warn(`[AirQuality Cron] Got stale history data. Retrying in 3 min...`)
      if (!airQualityHistoryRetryTimer) {
        airQualityHistoryRetryTimer = setTimeout(async () => {
          airQualityHistoryRetryTimer = null
          await fetchAndUpdateAirQualityHistoryCache()
        }, 3 * 60 * 1000)
      }
    } else if (airQualityHistoryRetryTimer) {
      clearTimeout(airQualityHistoryRetryTimer)
      airQualityHistoryRetryTimer = null
    }

  } catch (error) {
    console.error('[AirQuality Cron] History fetch failed:', error?.message)
  }
}


// รันทุกชั่วโมงที่นาทีที่ 7 — station (00:07, 01:07, ...)
cron.schedule('7 * * * *', () => {
  fetchAndUpdateAirQualityCache()
})

// รันทุกชั่วโมงที่นาทีที่ 8 — history (หลัง station 1 นาที เพื่อให้ rate limit อยู่ในเกณฑ์)
cron.schedule('8 * * * *', () => {
  fetchAndUpdateAirQualityHistoryCache()
})

console.log('[Cron] Air Quality proactive fetch เริ่มทำงานแล้ว (station: นาทีที่ 7, history: นาทีที่ 8)')

// ─── Initial fetch เมื่อ server เริ่มต้น ─────────────────────────────────────────
// ดึงข้อมูลทั้ง station และ history ทันทีที่ server start
// เพื่อให้ cache มีข้อมูลพร้อมใช้โดยไม่ต้องรอ cron รอบถัดไป
setTimeout(() => {
  fetchAndUpdateAirQualityCache()
  fetchAndUpdateAirQualityHistoryCache()
}, 3000)  // รอ 3 วิให้ server เริ่มต้นเสร็จก่อน


