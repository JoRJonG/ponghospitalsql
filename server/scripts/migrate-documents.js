// สคริปต์สำหรับรัน migration สร้างตาราง documents
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// โหลด environment variables
dotenv.config({ path: join(__dirname, '../.env') })

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'ponghospital',
        multipleStatements: true
    })

    try {
        console.log('กำลังเชื่อมต่อกับฐานข้อมูล...')

        // อ่านไฟล์ SQL
        const sqlFile = join(__dirname, '../database/create_documents_table.sql')
        const sql = readFileSync(sqlFile, 'utf8')

        console.log('กำลังรัน migration...')
        await connection.query(sql)

        console.log('✅ สร้างตาราง documents สำเร็จ!')

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message)
        process.exit(1)
    } finally {
        await connection.end()
    }
}

runMigration()
