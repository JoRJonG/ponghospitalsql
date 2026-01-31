import mysql from 'mysql2/promise'
import path from 'path'
import { existsSync } from 'fs'

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'ponghospitalsql',
    waitForConnections: true,
    connectionLimit: 10
})

async function checkPaths() {
    try {
        const [rows] = await pool.query('SELECT id, title, image_path FROM pr_posters')

        console.log('\n=== PR Posters Database Check ===\n')

        for (const row of rows) {
            console.log(`ID: ${row.id}`)
            console.log(`Title: ${row.title}`)
            console.log(`DB image_path: ${row.image_path}`)

            // Check all possible file locations
            const candidates = [
                path.join(process.cwd(), 'uploads', row.image_path),
                path.join(process.cwd(), row.image_path),
                path.join(process.cwd(), 'server', 'uploads', row.image_path)
            ]

            console.log('\nChecking file existence:')
            for (const candidate of candidates) {
                const exists = existsSync(candidate)
                console.log(`  ${exists ? '✓' : '✗'} ${candidate}`)
            }
            console.log('\n---\n')
        }

        await pool.end()
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

checkPaths()
