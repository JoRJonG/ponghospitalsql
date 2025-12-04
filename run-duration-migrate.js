import fs from 'fs'
import { query } from './server/database.js'

const sql = fs.readFileSync('./database/add_slide_duration.sql', 'utf8')

// Split by semicolon, but handle multi-line
const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))

for (const stmt of statements) {
  if (stmt) {
    console.log('Executing:', stmt.substring(0, 50) + '...')
    try {
      await query(stmt)
      console.log('✅ OK')
    } catch (e) {
      console.error('❌ Error:', e.message)
    }
  }
}

console.log('Duration migration completed')