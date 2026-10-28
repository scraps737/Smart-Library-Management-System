import { Router } from 'express'
import mongoose from 'mongoose'
import { Book } from '../models/Book.js'
import { Loan } from '../models/Loan.js'
import { profileSchema, objectId } from '../validation/schemas.js'
import { asyncHandler, ApiError } from '../middleware/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBook } from '../services/books.js'

const router = Router()
router.use(requireAuth)

/** GET /api/profile — the signed-in scholar's dashboard payload. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [loans, bookmarks] = await Promise.all([
      Loan.find({ user: req.user._id })
        .populate({ path: 'book', populate: { path: 'category', select: 'name slug' } })
        .sort({ borrowedAt: -1 }),
      Book.find({ _id: { $in: req.user.bookmarks } }).populate({ path: 'category', select: 'name slug icon' }),
    ])

    const mapped = loans.map((l) => {
      const obj = l.toObject({ virtuals: true })
      return {
        id: obj._id.toString(),
        status: obj.status,
        borrowedAt: obj.borrowedAt,
        dueDate: obj.dueDate,
        returnedAt: obj.returnedAt,
        renewals: obj.renewals,
        isOverdue: obj.isOverdue,
        isDueSoon: obj.isDueSoon,
        daysOverdue: obj.daysOverdue,
        book: obj.book
          ? serializeBook(obj.book)
          : null,
      }
    })

    res.json({
      user: req.user.toSafeJSON(),
      loans: mapped,
      activeLoans: mapped.filter((l) => l.status === 'active'),
      history: mapped.filter((l) => l.status === 'returned'),
      bookmarks: bookmarks.map((b) => serializeBook(b)),
      stats: {
        active: mapped.filter((l) => l.status === 'active').length,
        overdue: mapped.filter((l) => l.isOverdue).length,
        returned: mapped.filter((l) => l.status === 'returned').length,
        bookmarks: bookmarks.length,
      },
    })
  })
)

/** PATCH /api/profile — update the scholar's own details. */
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const data = profileSchema.parse(req.body)
    Object.assign(req.user, data)
    await req.user.save()
    res.json({ user: req.user.toSafeJSON() })
  })
)

/** POST /api/profile/bookmarks/:bookId — toggle a saved title. */
router.post(
  '/bookmarks/:bookId',
  asyncHandler(async (req, res) => {
    const { bookId } = req.params
    if (!mongoose.isValidObjectId(bookId)) throw new ApiError(404, 'Book not found')

    const book = await Book.findById(bookId)
    if (!book) throw new ApiError(404, 'Book not found')

    const index = req.user.bookmarks.findIndex((b) => b.toString() === bookId)
    const saved = index === -1
    if (saved) req.user.bookmarks.push(book._id)
    else req.user.bookmarks.splice(index, 1)
    await req.user.save()

    res.json({ saved, bookmarkCount: req.user.bookmarks.length })
  })
)

/** POST /api/profile/bookmarks/:bookId/check — used to reflect button state. */
router.get(
  '/bookmarks/:bookId',
  asyncHandler(async (req, res) => {
    const { bookId } = req.params
    if (!objectId.safeParse(bookId).success) return res.json({ saved: false })
    const saved = req.user.bookmarks.some((b) => b.toString() === bookId)
    res.json({ saved })
  })
)

export default router
