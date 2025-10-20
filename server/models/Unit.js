import mongoose from 'mongoose'

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
}, { _id: false })

const UnitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  href: { type: String, trim: true },
  image: { type: ImageSchema, required: false },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true })

const Unit = mongoose.models.Unit || mongoose.model('Unit', UnitSchema)
export default Unit
