import 'dotenv/config'
import mongoose from 'mongoose'
import Announcement from '../models/Announcement.js'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'ponghospital'

async function main(){
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(2) }
  try {
    mongoose.set('bufferCommands', false)
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME, serverSelectionTimeoutMS: 3000 })
    const count = await Announcement.countDocuments({})
    console.log(JSON.stringify({ ok:true, count }, null, 2))
    process.exit(0)
  } catch (e) {
    console.error('ERROR:', e && (e.message || e.toString()))
    process.exit(1)
  } finally {
    await mongoose.disconnect().catch(()=>{})
  }
}

main()
