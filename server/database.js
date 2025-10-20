import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Normalize host (บางครั้ง 'localhost' จะ resolve IPv6 ::1 แล้ว mysqld ไม่ได้ listen) -> ใช้ 127.0.0.1 แทน
const normalizedHost = (process.env.MYSQL_HOST || 'localhost') === 'localhost' ? '127.0.0.1' : (process.env.MYSQL_HOST || 'localhost')

// การตั้งค่าฐานข้อมูล MySQL
const dbConfig = {
  host: normalizedHost,
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ponghospital',
  charset: 'utf8mb4',
  timezone: '+07:00', // Thailand timezone
  // Connection pool settings
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  // Increased timeout for BLOB operations
  connectTimeout: 120000, // 2 minutes
  // Keep connection alive for long operations
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // SSL settings (ถ้าต้องการ)
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
}

// สร้าง connection pool
export const pool = mysql.createPool(dbConfig)

if (process.env.NODE_ENV !== 'production' && process.env.LOG_DB) {
  // console.log('[DB] config host=%s port=%s user=%s db=%s ssl=%s', dbConfig.host, dbConfig.port, dbConfig.user, dbConfig.database, dbConfig.ssl ? 'yes':'no')
}

// ฟังก์ชันทดสอบการเชื่อมต่อ
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    // console.log('✅ Connected to MySQL database successfully')
    
    // ทดสอบ query
    const [rows] = await connection.execute('SELECT 1 as test')
    // console.log('✅ Database query test passed')
    
    connection.release()
    return true
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message)
    return false
  }
}

// ฟังก์ชันปิดการเชื่อมต่อ
export async function closeConnection() {
  try {
    await pool.end()
    // console.log('📴 MySQL connection pool closed')
  } catch (error) {
    console.error('Error closing MySQL connection:', error.message)
  }
}

const RECOVERABLE_PATTERNS = [
  /closed state/i,
  /connection lost/i,
  /server has gone away/i,
  /ec?onn?reset/i
]

const isRecoverableDbError = (error) => {
  const msg = String(error?.message || '')
  return RECOVERABLE_PATTERNS.some((pattern) => pattern.test(msg))
}

async function executeWithRetry(fn, retries = 1) {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0 && isRecoverableDbError(error)) {
      console.warn('[DB] Recoverable error detected, retrying:', error.message)
      return executeWithRetry(fn, retries - 1)
    }
    console.error('[DB] Fatal error:', error.message)
    throw error
  }
}

// Helper function สำหรับ query ง่ายๆ
export async function query(sql, params = [], retries = 1) {
  return executeWithRetry(async () => {
    const [rows] = await pool.execute(sql, params)
    return rows
  }, retries)
}

// Helper function สำหรับ insert/update/delete
export async function exec(sql, params = [], retries = 1) {
  return executeWithRetry(async () => {
    const [result] = await pool.execute(sql, params)
    return result
  }, retries)
}

// Helper function สำหรับ transaction
export async function transaction(callback, retries = 1) {
  const connection = await pool.getConnection()
  let destroyed = false

  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    try {
      await connection.rollback()
    } catch {}

    if (retries > 0 && isRecoverableDbError(error)) {
      destroyed = true
      connection.destroy()
      console.warn('[DB] Transaction retry triggered:', error.message)
      return transaction(callback, retries - 1)
    }

    throw error
  } finally {
    if (!destroyed) {
      try {
        connection.release()
      } catch {
        connection.destroy()
      }
    }
  }
}

export default pool