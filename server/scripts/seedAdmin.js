import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'ponghospital'

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env')
    process.exit(2)
  }
  const username = process.env.ADMIN_USER || 'admin'
  const password = process.env.ADMIN_PASS || '1234'
  try {
    mongoose.set('bufferCommands', false)
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME, serverSelectionTimeoutMS: 3000 })
    const passwordHash = await bcrypt.hash(password, 10)
    const res = await User.updateOne(
      { username },
      { $set: { username, passwordHash, roles: ['admin'] } },
      { upsert: true }
    )
    console.log(JSON.stringify({ ok: true, username, upserted: Boolean(res.upsertedCount), matched: res.matchedCount, modified: res.modifiedCount }, null, 2))
    process.exit(0)
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect().catch(()=>{})
  }
}

main()
