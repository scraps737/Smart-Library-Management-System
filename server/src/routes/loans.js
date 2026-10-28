import { Router } from 'express'
import mongoose from 'mongoose'
import { Book } from '../models/Book.js'
import { Loan } from '../models/Loan.js'
import { InventoryTransaction } from '../models/InventoryTransaction.js'
import { asyncHandler, ApiError } from '../middleware/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { config } from '../config.js'

const router = Router()

const BOOK_POPULATE = { path: 'book', select: 'title author coverImage shelfmark availableCopies totalCopies' }
const USER_POPULATE = { path: 'user', select: 'firstName lastName email role avatarUrl' }

function serializeLoan(loan) {
  const l = loan.toObject ? loan.toObject({ virtuals: true }) : loan
  const book = l.book && l.book.title ? l.book : null
  const user = l.user && l.user.firstName ? l.user : null
  return {
    id: l._id.toString(),
    book: book
      ? {
          id: book._id.toString(),
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          shelfmark: book.shelfmark,
          availableCopies: book.availableCopies,
          totalCopies: book.totalCopies,
        }
      : { id: l.book?.toString() },
    user: user
      ? {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          avatarUrl: user.avatarUrl,
        }
      : { id: l.user?.toString() },
    borrowedAt: l.borrowedAt,
    dueDate: l.dueDate,
    returnedAt: l.returnedAt,
    status: l.status,
    renewals: l.renewals,
    isOverdue: l.isOverdue,
    isDueSoon: l.isDueSoon,
    daysOverdue: l.daysOverdue,
    notes: l.notes,
  }
}

export function decodeLoan(id) {
  return mongoose.isValidObjectId(id) ? id : null
}

/**
 * POST /api/loans — borrow a copy.
 * The availability decrement is a single conditional atomic update, so two
 * concurrent requests can never take the same last copy.
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookId = req.body?.bookId
    if (!decodeLoan(bookId)) throw new ApiError(422, 'A valid book is required')

    const book = await Book.findById(bookId)
    if (!book) throw new ApiError(404, 'Book not found')

    const existing = await Loan.findOne({ book: bookId, user: req.user._id, status: 'active' })
    if (existing) throw new ApiError(409, 'You already hold an active loan for this title')

    // Atomic guard: only decrements when a copy is genuinely available.
    const claimed = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    )
    if (!claimed) throw new ApiError(409, 'No copies are currently available for this title')

    let loan
    try {
      const dueDate = new Date(Date.now() + config.loanPeriodDays * 24 * 60 * 60 * 1000)
      loan = await Loan.create({ book: claimed._id, user: req.user._id, dueDate })
    } catch (err) {
      // Compensate so the catalogue never drifts from the ledger.
      await Book.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } })
      if (err?.code === 11000) throw new ApiError(409, 'You already hold an active loan for this title')
      throw err
    }

    await InventoryTransaction.create({
      type: 'borrow',
      book: claimed._id,
      loan: loan._id,
      delta: 0,
      availableDelta: -1,
      totalBefore: claimed.totalCopies,
      totalAfter: claimed.totalCopies,
      availableBefore: claimed.availableCopies + 1,
      availableAfter: claimed.availableCopies,
      reason: `Borrowed by ${req.user.firstName} ${req.user.lastName}`,
      actor: req.user._id,
    })

    await loan.populate([BOOK_POPULATE, USER_POPULATE])
    res.status(201).json({ loan: serializeLoan(loan) })
  })
)

/** GET /api/loans/me — the signed-in scholar's circulation record. */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const loans = await Loan.find({ user: req.user._id }).populate(BOOK_POPULATE).sort({ borrowedAt: -1 })
    const items = loans.map(serializeLoan)
    res.json({
      items,
      active: items.filter((l) => l.status === 'active'),
      history: items.filter((l) => l.status === 'returned'),
      stats: {
        active: items.filter((l) => l.status === 'active').length,
        overdue: items.filter((l) => l.isOverdue).length,
        returned: items.filter((l) => l.status === 'returned').length,
        total: items.length,
      },
    })
  })
)

/** GET /api/loans — circulation desk view (librarian/admin only). */
router.get(
  '/',
  requireAuth,
  requireRole('librarian', 'admin'),
  asyncHandler(async (req, res) => {
    const { status = 'active', search = '' } = req.query
    const filter = {}
    if (status === 'active') filter.status = 'active'
    if (status === 'overdue') {
      filter.status = 'active'
      filter.dueDate = { $lt: new Date() }
    }
    if (status === 'returned') filter.status = 'returned'

    let query = Loan.find(filter).populate([BOOK_POPULATE, USER_POPULATE]).sort({ dueDate: 1 }).limit(200)
    const loans = await query

    const items = loans.map(serializeLoan)
    const term = String(search).trim().toLowerCase()
    const filtered = term
      ? items.filter(
          (l) =>
            l.book?.title?.toLowerCase().includes(term) ||
            l.book?.shelfmark?.toLowerCase().includes(term) ||
            l.user?.name?.toLowerCase().includes(term) ||
            l.user?.email?.toLowerCase().includes(term)
        )
      : items

    const [allActive, overdue] = await Promise.all([
      Loan.countDocuments({ status: 'active' }),
      Loan.countDocuments({ status: 'active', dueDate: { $lt: new Date() } }),
    ])

    res.json({
      items: filtered,
      stats: {
        active: allActive,
        overdue,
        returned: await Loan.countDocuments({ status: 'returned' }),
        dueToday: await Loan.countDocuments({
          status: 'active',
          dueDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        }),
      },
    })
  })
)

/** POST /api/loans/:id/return — close a loan and restore the copy. */
router.post(
  '/:id/return',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!decodeLoan(req.params.id)) throw new ApiError(404, 'Loan not found')

    const loan = await Loan.findById(req.params.id)
    if (!loan) throw new ApiError(404, 'Loan not found')

    const isOwner = loan.user.toString() === req.user._id.toString()
    const isStaff = ['librarian', 'admin'].includes(req.user.role)
    if (!isOwner && !isStaff) throw new ApiError(403, 'You cannot return another scholar’s loan')

    const closed = await Loan.findOneAndUpdate(
      { _id: loan._id, status: 'active' },
      { status: 'returned', returnedAt: new Date(), notes: req.body?.notes || loan.notes },
      { new: true }
    )
    if (!closed) throw new ApiError(409, 'That loan has already been returned')

    const book = await Book.findById(closed.book)
    // Restore the copy but never let available exceed total.
    await Book.updateOne(
      { _id: closed.book, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
      { $inc: { availableCopies: 1 } }
    )

    if (book) {
      const refreshed = await Book.findById(closed.book)
      await InventoryTransaction.create({
        type: 'return',
        book: closed.book,
        loan: closed._id,
        delta: 0,
        availableDelta: 1,
        totalBefore: book.totalCopies,
        totalAfter: refreshed.totalCopies,
        availableBefore: book.availableCopies,
        availableAfter: refreshed.availableCopies,
        reason: `Returned by ${req.user.firstName} ${req.user.lastName}`,
        actor: req.user._id,
      })
    }

    await closed.populate([BOOK_POPULATE, USER_POPULATE])
    res.json({ loan: serializeLoan(closed) })
  })
)

/** POST /api/loans/:id/renew — extend a loan that is not yet overdue. */
router.post(
  '/:id/renew',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!decodeLoan(req.params.id)) throw new ApiError(404, 'Loan not found')

    const loan = await Loan.findById(req.params.id)
    if (!loan) throw new ApiError(404, 'Loan not found')

    const isOwner = loan.user.toString() === req.user._id.toString()
    if (!isOwner && !['librarian', 'admin'].includes(req.user.role)) {
      throw new ApiError(403, 'You cannot renew another scholar’s loan')
    }
    if (loan.status !== 'active') throw new ApiError(409, 'Only active loans can be renewed')
    if (loan.isOverdue) throw new ApiError(409, 'Overdue loans must be returned at the circulation desk')
    if (loan.renewals >= config.maxRenewals) {
      throw new ApiError(409, `This loan has already been renewed the maximum of ${config.maxRenewals} times`)
    }

    const base = loan.dueDate.getTime() > Date.now() ? loan.dueDate : new Date()
    loan.dueDate = new Date(base.getTime() + config.loanPeriodDays * 24 * 60 * 60 * 1000)
    loan.renewals += 1
    await loan.save()

    await loan.populate([BOOK_POPULATE, USER_POPULATE])
    res.json({ loan: serializeLoan(loan) })
  })
)

export default router
