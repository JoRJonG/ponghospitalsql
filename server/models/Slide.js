import mongoose from 'mongoose'

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
}, { _id: false })

const SlideSchema = new mongoose.Schema({
  title: { type: String, required: true },
  caption: { type: String },
  alt: { type: String },
  href: { type: String, trim: true },
  image: { type: ImageSchema, required: true },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true })

const Slide = mongoose.models.Slide || mongoose.model('Slide', SlideSchema)
export default Slide
