import { pool } from '../database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyIndexes() {
    console.log('🚀 Starting applyIndexes script...')
    let connection = null

    try {
        console.log('🔗 Connecting to MySQL via shared pool...')
        connection = await pool.getConnection()
        console.log('✅ Connected to MySQL successfully')

        const sqlPath = path.join(__dirname, '../../database/add_performance_indexes.sql')
        const sql = await fs.readFile(sqlPath, 'utf8')

        // Remove comments (both -- and /* */) to avoid parsing issues
        const cleanSql = sql
            .replace(/--.*$/gm, '') // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments

        const statements = cleanSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0)

        console.log(`📋 Found ${statements.length} index creation statements`)

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            try {
                await connection.execute(statement)
                console.log(`✅ Index ${i + 1}/${statements.length} created successfully`)
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`⚠️  Index ${i + 1}/${statements.length} skipped (already exists)`)
                } else {
                    console.error(`❌ Error creating index ${i + 1}:`, error.message)
                }
            }
        }

        console.log('🎉 Indexing completed!')

    } catch (error) {
        console.error('❌ Failed to apply indexes:', error.message)
        process.exit(1)
    } finally {
        if (connection) {
            connection.release()
        }
        // Close the pool to allow script to exit
        await pool.end()
    }
}

applyIndexes()
