import mongoose from 'mongoose'
import { Book } from '../models/Book.js'
import { Category } from '../models/Category.js'
import { Loan } from '../models/Loan.js'

const POPULATE = { path: 'category', select: 'name slug icon' }

export function serializeBook(book, extra = {}) {
  const b = book.toObject ? book.toObject({ virtuals: true }) : book
  return {
    ...b,
    id: b._id?.toString(),
    category: b.category && b.category.name ? b.category : { id: b.category?.toString() },
    isAvailable: b.availableCopies > 0,
    onLoanCopies: Math.max(0, b.totalCopies - b.availableCopies),
    ...extra,
  }
}

export async function findBookOr404(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Book.findById(id).populate(POPULATE)
}

export async function activeLoanCountFor(bookId) {
  return Loan.countDocuments({ book: bookId, status: 'active' })
}

export async function categoryIdForSlug(slug) {
  const category = await Category.findOne({ slug })
  return category ? category._id : null
}
