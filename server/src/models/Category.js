import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: 'menu_book' },
    image: { type: String, default: '' },
    collectionNote: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

export const Category = mongoose.model('Category', categorySchema)
