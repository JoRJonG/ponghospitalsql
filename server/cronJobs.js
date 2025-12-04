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


export default cron