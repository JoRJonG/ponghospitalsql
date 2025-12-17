import { pool } from '../database.js'

async function createGeoBlockingTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS geo_blocking_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        user_agent VARCHAR(500),
        path VARCHAR(255),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (ip_address),
        INDEX idx_country (country_code),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
    
    await pool.execute(sql)
    console.log('✅ Table geo_blocking_logs created successfully')
    
    // Verify table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'geo_blocking_logs'")
    console.log('✅ Table verification:', tables.length > 0 ? 'EXISTS' : 'NOT FOUND')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating table:', error.message)
    process.exit(1)
  }
}

createGeoBlockingTable()
