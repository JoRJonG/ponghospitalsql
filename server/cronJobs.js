// server/cronJobs.js
import cron from 'node-cron'
import { query, exec } from './database.js'
import { Visitor } from './models/mysql/Visitor.js'

// ฟังก์ชันลบประกาศเก่ากว่า 1 ปี
async function deleteOldAnnouncements() {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    // ลบประกาศและไฟล์แนบ
    const sql = `
      DELETE a, att
      FROM announcements a
      LEFT JOIN announcement_attachments att ON a.id = att.announcement_id
      WHERE a.created_at < ?
    `
    const result = await exec(sql, [oneYearAgo.toISOString().slice(0, 19).replace('T', ' ')])

    console.log(`[Cron] ลบประกาศเก่าแล้ว ${result.affectedRows} รายการ (รวมไฟล์แนบ)`)
  } catch (error) {
    console.error('[Cron] ลบประกาศล้มเหลว:', error)
  }
}

// รันทุกวันตอนเที่ยงคืน (00:00)
cron.schedule('0 0 * * *', deleteOldAnnouncements)

console.log('[Cron] ระบบลบประกาศอัตโนมัติเริ่มทำงานแล้ว (รันทุกวัน 00:00)')

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