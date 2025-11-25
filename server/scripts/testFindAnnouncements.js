import 'dotenv/config'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'ponghospital'

async function main(){
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(2) }
  try {
    process.exit(0)
  } catch (e) {
    console.error('ERROR:', e && (e.message || e.toString()))
    process.exit(1)
  } finally {
  }
}

// ...MongoDB/mongoose testFindAnnouncements script removed (no longer needed)...
