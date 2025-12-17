import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkSlides() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: 'ponghospital'
  }

  try {
    const connection = await mysql.createConnection(config)
    console.log('Connected to database')

    const [rows] = await connection.execute('SELECT id, title, display_order, is_published FROM slides ORDER BY display_order')
    console.log('Slides in database:')
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Title: ${row.title}, Order: ${row.display_order}, Published: ${row.is_published}`)
    })

    connection.end()
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSlides()