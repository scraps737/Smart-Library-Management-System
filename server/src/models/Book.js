import mongoose from 'mongoose'

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    subtitle: { type: String, default: '', trim: true },
    author: { type: String, required: true, trim: true, index: true },
    authorDates: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, required: true },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '/assets/stitch/ab2120dc13.jpg' },
    publishedYear: { type: Number },
    publisher: { type: String, default: '' },
    codexLanguage: { type: String, default: 'Latin' },
    pages: { type: Number },
    shelfmark: { type: String, default: '', index: true },
    callNumber: { type: String, default: '' },
    collectionName: { type: String, default: '' },
    accessTier: { type: String, default: 'Open Access IIIF' },
    digitalFidelity: { type: String, default: '1200 DPI Multispectral' },
    location: { type: String, default: 'Reading Room Vault' },
    tags: [{ type: String, trim: true }],
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    citationCount: { type: Number, default: 0, min: 0 },
    totalCopies: { type: Number, required: true, min: 0, default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

bookSchema.index({ title: 'text', author: 'text', description: 'text', shelfmark: 'text' })

bookSchema.virtual('isAvailable').get(function () {
  return this.availableCopies > 0
})

bookSchema.virtual('onLoanCopies').get(function () {
  return Math.max(0, this.totalCopies - this.availableCopies)
})

bookSchema.pre('validate', function (next) {
  if (this.availableCopies > this.totalCopies) {
    return next(new Error('availableCopies cannot exceed totalCopies'))
  }
  next()
})

export const Book = mongoose.model('Book', bookSchema)
