// Manual file deletion test script
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const testFilePath = 'pr_posters/poster-1769841781582-549754261.webp'

console.log('\n=== Manual File Deletion Test ===\n')
console.log('Working directory:', process.cwd())
console.log('Test file path from DB:', testFilePath)

// Test all possible paths
const candidates = [
    path.join(process.cwd(), 'uploads', testFilePath),
    path.join(process.cwd(), testFilePath),
    path.join(process.cwd(), 'server', 'uploads', testFilePath)
]

console.log('\nTesting paths:\n')

for (const candidate of candidates) {
    const normalized = path.normalize(candidate)
    const exists = existsSync(normalized)
    console.log(`Path: ${normalized}`)
    console.log(`Exists: ${exists ? '✓ YES' : '✗ NO'}`)

    if (exists) {
        console.log('>>> This is the correct path! <<<')
        console.log('\nAttempting to delete...')
        try {
            await fs.unlink(normalized)
            console.log('✓✓ Successfully deleted!')
        } catch (err) {
            console.error('✗✗ Failed to delete:', err.message)
        }
    }
    console.log('')
}
