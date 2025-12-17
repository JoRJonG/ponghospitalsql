import mysql from 'mysql2/promise'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ponghospital',
    charset: 'utf8mb4'
  }

  let connection = null

  try {
    console.log('🔗 Connecting to MySQL database...')
    connection = await mysql.createConnection(config)

    console.log('✅ Connected to MySQL database successfully')

    console.log('📋 Executing migration SQL...')

    // Execute statements ทีละตัว
    const statements = [
      'USE ponghospital',
      'ALTER TABLE activities ADD COLUMN view_count INT DEFAULT 0',
      'ALTER TABLE announcements ADD COLUMN view_count INT DEFAULT 0',
      'UPDATE activities SET view_count = 0 WHERE view_count IS NULL',
      'UPDATE announcements SET view_count = 0 WHERE view_count IS NULL'
    ]

    console.log(`📋 Found ${statements.length} SQL statements to execute`)

    // Execute แต่ละ statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      try {
        await connection.execute(statement)
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`)
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (column already exists)`)
        } else {
          throw error
        }
      }
    }

    console.log(`📋 Found ${statements.length} SQL statements to execute`)

    // Execute แต่ละ statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length > 0) {
        try {
          await connection.execute(statement)
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`)
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (column already exists)`)
          } else {
            throw error
          }
        }
      }
    }

    console.log('✅ Migration executed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Database connection closed')
    }
  }
}

runMigration()