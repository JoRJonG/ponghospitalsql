// สคริปต์สำหรับรัน migration สร้างตาราง feedback
import dotenv from 'dotenv'
import pool from './server/database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
    try {
        console.log('🔄 กำลังรัน migration สร้างตาราง feedback...')

        const sqlPath = path.join(__dirname, 'database', 'create_feedback_table.sql')
        const sql = await fs.readFile(sqlPath, 'utf8')

        await pool.query(sql)

        console.log('✅ สร้างตาราง feedback สำเร็จ!')

        // ตรวจสอบว่าตารางถูกสร้างแล้ว
        const [rows] = await pool.query('SHOW TABLES LIKE "feedback"')
        if (rows.length > 0) {
            console.log('✅ ยืนยันตาราง feedback ถูกสร้างในฐานข้อมูลแล้ว')
        }

        process.exit(0)
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการรัน migration:', error.message)
        process.exit(1)
    }
}

runMigration()
