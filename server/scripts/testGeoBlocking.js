import { pool } from '../database.js'

async function testGeoBlocking() {
  try {
    // Check table structure
    const [columns] = await pool.execute("DESCRIBE geo_blocking_logs")
    console.log('📊 Table structure:')
    console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Key: c.Key })))
    
    // Check if there are any logs
    const [logs] = await pool.execute("SELECT * FROM geo_blocking_logs ORDER BY timestamp DESC LIMIT 5")
    console.log('\n📝 Recent blocked access attempts:', logs.length)
    if (logs.length > 0) {
      console.table(logs)
    }
    
    // Test insert
    const testData = {
      ip: '8.8.8.8',
      country: 'US',
      userAgent: 'Test/1.0',
      path: '/test'
    }
    
    await pool.execute(
      'INSERT INTO geo_blocking_logs (ip_address, country_code, user_agent, path) VALUES (?, ?, ?, ?)',
      [testData.ip, testData.country, testData.userAgent, testData.path]
    )
    console.log('✅ Test insert successful')
    
    // Verify insert
    const [inserted] = await pool.execute("SELECT * FROM geo_blocking_logs WHERE ip_address = ? ORDER BY timestamp DESC LIMIT 1", [testData.ip])
    console.log('\n✅ Inserted record:')
    console.table(inserted)
    
    // Clean up test data
    await pool.execute("DELETE FROM geo_blocking_logs WHERE ip_address = ?", [testData.ip])
    console.log('✅ Test data cleaned up')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testGeoBlocking()
