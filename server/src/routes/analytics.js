import { Router } from 'express'
import { Book } from '../models/Book.js'
import { Loan } from '../models/Loan.js'
import { User } from '../models/User.js'
import { Category } from '../models/Category.js'
import { InventoryTransaction } from '../models/InventoryTransaction.js'
import { asyncHandler } from '../middleware/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const DAY = 24 * 60 * 60 * 1000

/**
 * GET /api/analytics/overview — every figure is aggregated from live documents,
 * never from hardcoded demo numbers. Staff only.
 */
router.get(
  '/overview',
  requireAuth,
  requireRole('librarian', 'admin'),
  asyncHandler(async (req, res) => {
    const now = new Date()
    const rangeStart = new Date(now.getTime() - 365 * DAY)
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const [
      inventory,
      copiesAgg,
      activeLoans,
      overdueLoans,
      dueSoon,
      loansTrend,
      topBooks,
      byCategory,
      languages,
      recentLedger,
      scholarCount,
      acquisitions,
      returnsByMonth,
    ] = await Promise.all([
      Book.countDocuments(),
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
          },
        },
      ]),
      Loan.countDocuments({ status: 'active' }),
      Loan.countDocuments({ status: 'active', dueDate: { $lt: now } }),
      Loan.countDocuments({ status: 'active', dueDate: { $gte: now, $lte: new Date(now.getTime() + 3 * DAY) } }),
      Loan.aggregate([
        { $match: { borrowedAt: { $gte: trendStart } } },
        {
          $group: {
            _id: { y: { $year: '$borrowedAt' }, m: { $month: '$borrowedAt' } },
            borrowed: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Loan.aggregate([
        { $group: { _id: '$book', loans: { $sum: 1 } } },
        { $sort: { loans: -1 } },
        { $limit: 6 },
        { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $lookup: { from: 'categories', localField: 'book.category', foreignField: '_id', as: 'category' },
        },
        {
          $project: {
            loans: 1,
            title: '$book.title',
            author: '$book.author',
            coverImage: '$book.coverImage',
            shelfmark: '$book.shelfmark',
            category: { $arrayElemAt: ['$category.name', 0] },
          },
        },
      ]),
      Book.aggregate([
        { $group: { _id: '$category', titles: { $sum: 1 }, copies: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        {
          $project: {
            name: '$category.name',
            slug: '$category.slug',
            icon: '$category.icon',
            titles: 1,
            copies: 1,
            available: 1,
            onLoan: { $subtract: ['$copies', '$available'] },
          },
        },
        { $sort: { titles: -1 } },
      ]),
      Book.distinct('codexLanguage'),
      InventoryTransaction.find()
        .sort({ createdAt: -1 })
        .limit(12)
        .populate({ path: 'book', select: 'title author' })
        .populate({ path: 'actor', select: 'firstName lastName' }),
      User.countDocuments({ role: 'scholar' }),
      Book.countDocuments({ createdAt: { $gte: new Date(now.getTime() - 90 * DAY) } }),
      Loan.aggregate([
        { $match: { status: 'returned', returnedAt: { $gte: rangeStart } } },
        { $group: { _id: null, total: { $sum: 1 }, avgDays: { $avg: { $divide: [{ $subtract: ['$returnedAt', '$borrowedAt'] }, DAY] } } } },
      ]),
    ])

    const totals = copiesAgg[0] || { totalCopies: 0, availableCopies: 0 }
    const utilisation =
      totals.totalCopies > 0
        ? Math.round(((totals.totalCopies - totals.availableCopies) / totals.totalCopies) * 1000) / 10
        : 0

    const returnsStats = returnsByMonth[0] || { total: 0, avgDays: 0 }

    // Return rate: returned loans vs all loans ever created.
    const totalLoansEver = await Loan.countDocuments()
    const totalReturned = await Loan.countDocuments({ status: 'returned' })

    res.json({
      generatedAt: now,
      kpis: {
        titles: inventory,
        totalCopies: totals.totalCopies,
        availableCopies: totals.availableCopies,
        onLoan: activeLoans,
        overdue: overdueLoans,
        dueSoon,
        scholars: scholarCount,
        acquisitionsLast90Days: acquisitions,
        utilisation,
        returnRate: totalLoansEver ? Math.round((totalReturned / totalLoansEver) * 1000) / 10 : 0,
        avgLoanDays: Math.round((returnsStats.avgDays || 0) * 10) / 10,
      },
      trend: loansTrend.map((t) => ({
        month: `${t._id.y}-${String(t._id.m).padStart(2, '0')}`,
        borrowed: t.borrowed,
      })),
      topBooks,
      byCategory,
      languages: languages.filter(Boolean).sort(),
      recentLedger: recentLedger.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        delta: t.delta,
        availableDelta: t.availableDelta,
        totalBefore: t.totalBefore,
        totalAfter: t.totalAfter,
        reason: t.reason,
        book: t.book ? { id: t.book._id.toString(), title: t.book.title, author: t.book.author } : null,
        actor: t.actor ? `${t.actor.firstName} ${t.actor.lastName}`.trim() : 'System',
        createdAt: t.createdAt,
      })),
    })
  })
)

export default router
