import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// สร้างฐานข้อมูล SQLite
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../database/ponghospital.db')

// สร้างโฟลเดอร์หากไม่มี
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new Database(dbPath)

// เปิด WAL mode สำหรับ performance ที่ดีกว่า
db.pragma('journal_mode = WAL')

// ฟังก์ชันทดสอบการเชื่อมต่อ
export async function testConnection() {
  try {
    const result = db.prepare('SELECT 1 as test').get()
    console.log('✅ Connected to SQLite database successfully')
    console.log(`📁 Database location: ${dbPath}`)
    return true
  } catch (error) {
    console.error('❌ SQLite connection failed:', error.message)
    return false
  }
}

// ฟังก์ชันปิดการเชื่อมต่อ
export async function closeConnection() {
  try {
    db.close()
    console.log('📴 SQLite connection closed')
  } catch (error) {
    console.error('Error closing SQLite connection:', error.message)
  }
}

// Helper function สำหรับ query
export function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql)
    return stmt.all(params)
  } catch (error) {
    console.error('Query error:', error.message)
    console.error('SQL:', sql)
    throw error
  }
}

// Helper function สำหรับ single result
export function queryOne(sql, params = []) {
  try {
    const stmt = db.prepare(sql)
    return stmt.get(params)
  } catch (error) {
    console.error('Query error:', error.message)
    console.error('SQL:', sql)
    throw error
  }
}

// Helper function สำหรับ insert/update/delete
export function exec(sql, params = []) {
  try {
    const stmt = db.prepare(sql)
    return stmt.run(params)
  } catch (error) {
    console.error('Exec error:', error.message)
    console.error('SQL:', sql)
    throw error
  }
}

// Helper function สำหรับ transaction
export function transaction(callback) {
  const trans = db.transaction(callback)
  return trans()
}

// สร้างตารางเริ่มต้น
export function initializeDatabase() {
  // ตารางผู้ใช้งาน
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      roles TEXT DEFAULT '["admin"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ตารางหมวดหมู่ประกาศ
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ตารางประกาศ
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      content TEXT,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_published BOOLEAN DEFAULT 1,
      created_by TEXT,
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES announcement_categories(id)
    )
  `)

  // ตารางไฟล์แนบประกาศ
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      public_id TEXT,
      kind TEXT DEFAULT 'image',
      name TEXT,
      bytes INTEGER,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    )
  `)

  // ตารางกิจกรรม
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date DATE,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_published BOOLEAN DEFAULT 1,
      created_by TEXT,
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ตารางรูปภาพกิจกรรม
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      public_id TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `)

  // ตารางสไลด์
  db.exec(`
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      caption TEXT,
      alt TEXT,
      href TEXT,
      image_url TEXT NOT NULL,
      image_public_id TEXT,
      display_order INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ตารางหน่วยงาน
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      href TEXT,
      image_url TEXT,
      image_public_id TEXT,
      display_order INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // เพิ่มข้อมูลเริ่มต้น
  const categoriesExist = queryOne('SELECT COUNT(*) as count FROM announcement_categories')
  if (categoriesExist.count === 0) {
    exec(`INSERT INTO announcement_categories (name, display_name) VALUES ('job', 'สมัครงาน')`)
    exec(`INSERT INTO announcement_categories (name, display_name) VALUES ('pr', 'ประชาสัมพันธ์')`)
    exec(`INSERT INTO announcement_categories (name, display_name) VALUES ('announce', 'ประกาศ')`)
    console.log('✅ Added initial announcement categories')
  }

  console.log('✅ Database initialized successfully')
}

export default db