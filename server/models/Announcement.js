import mongoose from 'mongoose'

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, enum: ['สมัครงาน', 'ประชาสัมพันธ์', 'ประกาศ'], required: true },
    content: { type: String },
    attachments: [
      new mongoose.Schema(
        {
          url: { type: String, required: true },
          publicId: { type: String },
          kind: { type: String, enum: ['image', 'pdf', 'file'], default: 'image' },
          name: { type: String },
          bytes: { type: Number },
        },
        { _id: false }
      )
    ],
    // ใช้เป็นเวลาเผยแพร่จริง และสามารถตั้งเวลาในอนาคตได้ (scheduled publish)
    publishedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

// ...MongoDB/mongoose Announcement model removed (no longer needed)...
// export default mongoose.model('Announcement', AnnouncementSchema)
