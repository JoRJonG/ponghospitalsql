import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], default: ['admin'] },
  },
  { timestamps: true }
)

export default mongoose.model('User', UserSchema)
