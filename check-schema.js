import { query } from './server/database.js'

const tables = ['announcement_attachments', 'slides', 'units', 'activity_images']

for (const table of tables) {
  try {
    const rows = await query(`DESCRIBE ${table}`)
    console.log(`Table: ${table}`)
    rows.forEach(row => console.log(`  ${row.Field}: ${row.Type}`))
  } catch (e) {
    console.error(`Error describing ${table}:`, e.message)
  }
}