import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'ponghospital'

async function main() {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(2) }
  try {
    mongoose.set('bufferCommands', false)
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME, serverSelectionTimeoutMS: 3000 })
    // group by username and keep the latest, delete others
    const users = await User.find({}, null, { sort: { createdAt: 1 } })
    const seen = new Map()
    const toDelete = []
    for (const u of users) {
      const key = (u.username || '').toLowerCase()
      if (seen.has(key)) {
        // keep the last one (newest), so mark previous for deletion
        const existing = seen.get(key)
        // mark the older one for deletion
        toDelete.push(existing._id)
        seen.set(key, u) // newest as keeper
      } else {
        seen.set(key, u)
      }
    }
    if (toDelete.length) {
      const r = await User.deleteMany({ _id: { $in: toDelete } })
      console.log(JSON.stringify({ deleted: r.deletedCount }, null, 2))
    } else {
      console.log(JSON.stringify({ deleted: 0 }, null, 2))
    }
    // ensure unique index after cleanup
    try { await User.collection.createIndex({ username: 1 }, { unique: true }) } catch {}
    process.exit(0)
  } catch (e) {
    console.error('ERROR:', e.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect().catch(()=>{})
  }
}

main()
