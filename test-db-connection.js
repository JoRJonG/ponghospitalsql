import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function testDB() {
  console.log('\n🔍 กำลังเช็คการเชื่อมต่อฐานข้อมูล...\n')
  
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  }
  
  console.log('📋 ข้อมูลการเชื่อมต่อ:')
  console.log(`   Host: ${config.host}:${config.port}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Password: ${config.password ? '***' : '(ไม่มี)'}\n`)
  
  try {
    // ทดสอบเชื่อมต่อ MySQL server
    console.log('1️⃣ ทดสอบเชื่อมต่อ MySQL server...')
    const connection = await mysql.createConnection(config)
    console.log('   ✅ เชื่อมต่อ MySQL สำเร็จ!\n')
    
    // เช็ค databases ทั้งหมด
    console.log('2️⃣ ตรวจสอบ databases ที่มี...')
    const [databases] = await connection.execute('SHOW DATABASES')
    console.log('   📚 Databases ที่มี:')
    databases.forEach(db => {
      const dbName = db.Database || db.database
      const icon = dbName === 'ponghospital' ? '✅' : '  '
      console.log(`   ${icon} - ${dbName}`)
    })
    
    // เช็คว่ามี database ponghospital หรือไม่
    const hasPonghospital = databases.some(db => 
      (db.Database || db.database) === 'ponghospital'
    )
    
    if (hasPonghospital) {
      console.log('\n3️⃣ ตรวจสอบตารางใน database ponghospital...')
      await connection.query('USE ponghospital')
      const [tables] = await connection.query('SHOW TABLES')
      
      if (tables.length === 0) {
        console.log('   ⚠️  Database ponghospital มีอยู่แต่ยังไม่มีตารางใดๆ')
        console.log('   📝 คุณต้องรัน SQL ใน phpMyAdmin ก่อน!')
      } else {
        console.log(`   ✅ พบตาราง ${tables.length} ตาราง:`)
        tables.forEach(table => {
          const tableName = Object.values(table)[0]
          console.log(`      - ${tableName}`)
        })
      }
    } else {
      console.log('\n   ⚠️  ไม่พบ database "ponghospital"')
      console.log('   📝 คุณต้องรัน SQL ใน phpMyAdmin เพื่อสร้าง database!')
    }
    
    await connection.end()
    console.log('\n✅ การตรวจสอบเสร็จสิ้น!\n')
    
  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 แนะนำ:')
      console.error('   - ตรวจสอบว่า XAMPP MySQL กำลังทำงานอยู่หรือไม่')
      console.error('   - เปิด XAMPP Control Panel และกด Start ที่ MySQL')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 แนะนำ:')
      console.error('   - ตรวจสอบ username และ password ใน .env')
      console.error('   - Default ของ XAMPP คือ user=root, password=(ว่าง)')
    }
    
    process.exit(1)
  }
}

testDB()
