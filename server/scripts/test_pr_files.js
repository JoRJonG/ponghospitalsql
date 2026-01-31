// Simple script to check PR Poster files and paths
import { readFileSync } from 'fs'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

console.log('\n=== PR Posters File Check ===\n')

// Check uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads', 'pr_posters')
console.log('Checking directory:', uploadsDir)
console.log('Directory exists:', existsSync(uploadsDir))

if (existsSync(uploadsDir)) {
    const files = readdirSync(uploadsDir)
    console.log('\nFiles in pr_posters folder:')
    files.forEach(file => {
        const fullPath = path.join(uploadsDir, file)
        const stats = readFileSync(fullPath)
        console.log(`  - ${file} (${(stats.length / 1024).toFixed(2)} KB)`)
    })
    console.log(`\nTotal files: ${files.length}`)
} else {
    console.log('Directory does not exist!')
}

console.log('\n=== Path Resolution Test ===\n')
console.log('process.cwd():', process.cwd())
console.log('Expected upload path:', path.join(process.cwd(), 'uploads', 'pr_posters'))

// Test path construction
const testDbPath = 'pr_posters/poster-1769841424432-835922080.webp'
console.log('\nTest DB path:', testDbPath)
console.log('Constructed path:', path.join(process.cwd(), 'uploads', testDbPath))
console.log('File exists:', existsSync(path.join(process.cwd(), 'uploads', testDbPath)))
