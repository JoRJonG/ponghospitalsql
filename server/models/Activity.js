import mongoose from 'mongoose'

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    images: [{
      url: { type: String, required: true },
      publicId: { type: String },
    }],
    date: { type: Date, default: Date.now },
    createdBy: { type: String },
    updatedBy: { type: String },
    // align with announcements: allow scheduled publish
    publishedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.model('Activity', ActivitySchema)
