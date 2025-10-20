import mysql from 'mysql2/promise'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    charset: 'utf8mb4'
  }

  let connection = null

  try {
    console.log('🔗 Connecting to MySQL...')
    connection = await mysql.createConnection(config)
    
    console.log('✅ Connected to MySQL successfully')

    // อ่านไฟล์ schema
    const schemaPath = path.join(__dirname, '../../database/mysql_schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')

    // แยก SQL statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements to execute`)

    // Execute แต่ละ statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length > 0) {
        try {
          await connection.execute(statement)
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`)
        } catch (error) {
          if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`)
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message)
            console.error(`Statement: ${statement.substring(0, 100)}...`)
          }
        }
      }
    }

    console.log('🎉 Database setup completed successfully!')

    // ทดสอบการเชื่อมต่อ
    console.log('\n🔍 Testing database connection...')
    const dbName = process.env.MYSQL_DATABASE || 'ponghospital'
    await connection.execute(`USE ${dbName}`)
    
    const [tables] = await connection.execute('SHOW TABLES')
    console.log(`📊 Found ${tables.length} tables:`)
    tables.forEach(table => {
      const tableName = table[`Tables_in_${dbName}`]
      console.log(`   - ${tableName}`)
    })

    // ตรวจสอบข้อมูลเริ่มต้น
    console.log('\n📋 Checking initial data...')
    
    const [categories] = await connection.execute('SELECT * FROM announcement_categories')
    console.log(`   - Announcement categories: ${categories.length}`)
    
    const [users] = await connection.execute('SELECT username FROM users')
    console.log(`   - Users: ${users.length}`)
    users.forEach(user => {
      console.log(`     * ${user.username}`)
    })

  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('📴 Database connection closed')
    }
  }
}

// เรียกใช้ function ถ้า script ถูกเรียกโดยตรง
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
}