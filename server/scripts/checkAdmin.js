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
  try {
    mongoose.set('bufferCommands', false)
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME, serverSelectionTimeoutMS: 3000 })
    const user = await User.findOne({ username: 'admin' })
    if (!user) {
      console.log(JSON.stringify({ exists: false }, null, 2))
      process.exit(0)
    }
    const ok = await bcrypt.compare('1234', user.passwordHash)
    console.log(JSON.stringify({ exists: true, passwordMatches1234: ok, roles: user.roles }, null, 2))
    process.exit(0)
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect().catch(()=>{})
  }
}

main()
