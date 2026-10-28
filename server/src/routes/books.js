import { Router } from 'express'
import mongoose from 'mongoose'
import { Book } from '../models/Book.js'
import { Category } from '../models/Category.js'
import { Loan } from '../models/Loan.js'
import { InventoryTransaction } from '../models/InventoryTransaction.js'
import { bookSchema, bookUpdateSchema, stockSchema, objectId } from '../validation/schemas.js'
import { asyncHandler, ApiError } from '../middleware/errors.js'
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js'
import { serializeBook } from '../services/books.js'

const router = Router()
const POPULATE = { path: 'category', select: 'name slug icon image' }

const SORTS = {
  relevance: { featured: -1, citationCount: -1, title: 1 },
  'year-asc': { publishedYear: 1, title: 1 },
  'year-desc': { publishedYear: -1, title: 1 },
  title: { title: 1 },
  shelfmark: { shelfmark: 1 },
  popular: { citationCount: -1 },
  recent: { createdAt: -1 },
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Accepts ?k=a&k=b or ?k=a,b and always returns a clean array. */
function asArray(value) {
  if (value === undefined || value === null) return []
  const raw = Array.isArray(value) ? value : String(value).split(',')
  return raw.map((v) => String(v).trim()).filter(Boolean)
}

const yearOrUndefined = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

async function buildFilter(query) {
  const filter = {}
  const search = String(query.search || '').trim()

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { title: rx },
      { subtitle: rx },
      { author: rx },
      { shelfmark: rx },
      { callNumber: rx },
      { publisher: rx },
      { description: rx },
      { tags: rx },
    ]
  }

  const categoryValues = asArray(query.category)
  if (categoryValues.length) {
    const ids = categoryValues.filter((v) => mongoose.isValidObjectId(v))
    const slugs = categoryValues.filter((v) => !mongoose.isValidObjectId(v))
    const [byId, bySlug] = await Promise.all([
      ids.length ? Category.find({ _id: { $in: ids } }).select('_id') : [],
      slugs.length ? Category.find({ slug: { $in: slugs } }).select('_id') : [],
    ])
    const categoryIds = [...byId, ...bySlug].map((c) => c._id)
    if (!categoryIds.length) return { empty: true }
    filter.category = { $in: categoryIds }
  }

  const languages = asArray(query.codexLanguage || query.language)
  if (languages.length) {
    filter.codexLanguage = { $in: languages.map((l) => new RegExp(`^${escapeRegex(l)}$`, 'i')) }
  }

  const tiers = asArray(query.accessTier)
  if (tiers.length) filter.accessTier = { $in: tiers }

  const authors = asArray(query.author)
  if (authors.length) filter.author = { $in: authors.map((a) => new RegExp(`^${escapeRegex(a)}$`, 'i')) }

  const collections = asArray(query.collection)
  if (collections.length) {
    filter.collectionName = { $in: collections.map((c) => new RegExp(`^${escapeRegex(c)}$`, 'i')) }
  }

  const yearFrom = yearOrUndefined(query.yearFrom)
  const yearTo = yearOrUndefined(query.yearTo)
  if (yearFrom || yearTo) {
    filter.publishedYear = {}
    if (yearFrom) filter.publishedYear.$gte = yearFrom
    if (yearTo) filter.publishedYear.$lte = yearTo
  }

  const availability = query.availability
  if (availability === 'available') filter.availableCopies = { $gt: 0 }
  if (availability === 'unavailable') filter.availableCopies = 0
  if (availability === 'onloan') {
    filter.$expr = { $gt: [{ $subtract: ['$totalCopies', '$availableCopies'] }, 0] }
  }

  if (query.featured === 'true') filter.featured = true

  return { filter }
}

/** Facet counts are aggregated from live documents, never hardcoded. */
async function buildFacets() {
  const [categories, languages, tiers, authors, collections, range] = await Promise.all([
    Book.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, available: { $sum: '$availableCopies' } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      {
        $project: {
          id: '$category._id',
          name: '$category.name',
          slug: '$category.slug',
          icon: '$category.icon',
          count: 1,
          available: 1,
        },
      },
      { $sort: { name: 1 } },
    ]),
    Book.aggregate([{ $group: { _id: '$codexLanguage', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Book.aggregate([{ $group: { _id: '$accessTier', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Book.aggregate([{ $group: { _id: '$author', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 14 }]),
    Book.aggregate([{ $group: { _id: '$collectionName', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Book.aggregate([{ $group: { _id: null, min: { $min: '$publishedYear' }, max: { $max: '$publishedYear' } } }]),
  ])

  const clean = (rows) => rows.filter((r) => r._id).map((r) => ({ value: r._id, count: r.count }))

  return {
    categories,
    languages: clean(languages),
    accessTiers: clean(tiers),
    authors: clean(authors),
    collections: clean(collections),
    yearRange: range[0] ? { min: range[0].min, max: range[0].max } : { min: null, max: null },
  }
}

/** GET /api/books — catalog search, filtering, sorting and pagination. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12))
    const sort = req.query.sort || 'relevance'

    const { filter, empty } = await buildFilter(req.query)
    const facets = await buildFacets()

    if (empty) {
      return res.json({ items: [], total: 0, page, limit, pages: 1, facets })
    }

    const [items, total] = await Promise.all([
      Book.find(filter)
        .populate(POPULATE)
        .sort(SORTS[sort] || SORTS.relevance)
        .skip((page - 1) * limit)
        .limit(limit),
      Book.countDocuments(filter),
    ])

    // Attach live loan counts for this page with a single extra aggregation.
    const loanCounts = items.length
      ? await Loan.aggregate([
          { $match: { book: { $in: items.map((b) => b._id) }, status: 'active' } },
          { $group: { _id: '$book', active: { $sum: 1 }, renewed: { $sum: '$renewals' } } },
        ])
      : []
    const loanByBook = new Map(loanCounts.map((l) => [l._id.toString(), l]))

    res.json({
      items: items.map((b) =>
        serializeBook(b, {
          activeLoans: loanByBook.get(b._id.toString())?.active || 0,
          renewals: loanByBook.get(b._id.toString())?.renewed || 0,
        })
      ),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      facets,
    })
  })
)

/** GET /api/books/filters — the facet payload used to build the refine sidebar. */
router.get(
  '/filters',
  asyncHandler(async (req, res) => {
    res.json(await buildFacets())
  })
)

/** GET /api/books/:id — full record plus availability and circulation context. */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Book not found')

    const book = await Book.findById(req.params.id).populate(POPULATE)
    if (!book) throw new ApiError(404, 'Book not found')

    const [activeLoans, related, myLoan] = await Promise.all([
      Loan.countDocuments({ book: book._id, status: 'active' }),
      Book.find({ category: book.category?._id, _id: { $ne: book._id } }).limit(4).populate(POPULATE),
      req.user ? Loan.findOne({ book: book._id, user: req.user._id, status: 'active' }) : null,
    ])

    res.json({
      book: serializeBook(book, { activeLoans }),
      related: related.map((b) => serializeBook(b)),
      myActiveLoan: myLoan
        ? { id: myLoan._id.toString(), dueDate: myLoan.dueDate, isOverdue: myLoan.isOverdue, renewals: myLoan.renewals }
        : null,
    })
  })
)

/** POST /api/books — catalogue a new acquisition (librarian/admin only). */
router.post(
  '/',
  requireAuth,
  requireRole('librarian', 'admin'),
  asyncHandler(async (req, res) => {
    const data = bookSchema.parse(req.body)
    const category = await Category.findById(data.category)
    if (!category) throw new ApiError(422, 'The selected discipline does not exist')

    const available = data.availableCopies ?? data.totalCopies
    if (available > data.totalCopies) {
      throw new ApiError(422, 'Available copies cannot exceed total copies')
    }

    const book = await Book.create({ ...data, availableCopies: available })
    await InventoryTransaction.create({
      type: 'acquire',
      book: book._id,
      delta: book.totalCopies,
      availableDelta: book.availableCopies,
      totalBefore: 0,
      totalAfter: book.totalCopies,
      availableBefore: 0,
      availableAfter: book.availableCopies,
      reason: 'Initial catalogue accession',
      actor: req.user._id,
    })

    await book.populate(POPULATE)
    res.status(201).json({ book: serializeBook(book) })
  })
)

/** PATCH /api/books/:id — correct metadata (librarian/admin only). */
router.patch(
  '/:id',
  requireAuth,
  requireRole('librarian', 'admin'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Book not found')
    const data = bookUpdateSchema.parse(req.body)

    const book = await Book.findById(req.params.id)
    if (!book) throw new ApiError(404, 'Book not found')

    // Copy counts must only change through the audited stock endpoint.
    delete data.totalCopies
    delete data.availableCopies

    Object.assign(book, data)
    await book.save()
    await book.populate(POPULATE)
    res.json({ book: serializeBook(book) })
  })
)

/**
 * POST /api/books/:id/stock — audited stock adjustment (librarian/admin only).
 * Uses conditional atomic updates so copies can never go negative and total can
 * never drop below the number of copies currently on loan.
 */
router.post(
  '/:id/stock',
  requireAuth,
  requireRole('librarian', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Book not found')
    const { delta, reason } = stockSchema.parse(req.body)

    const before = await Book.findById(id)
    if (!before) throw new ApiError(404, 'Book not found')

    const onLoan = before.totalCopies - before.availableCopies
    if (delta < 0 && before.totalCopies + delta < onLoan) {
      throw new ApiError(
        409,
        `Cannot remove ${Math.abs(delta)} copies — ${onLoan} are currently on loan.`
      )
    }

    // Guarded update: only applies when the resulting copies stay valid.
    const updated = await Book.findOneAndUpdate(
      delta > 0
        ? { _id: id }
        : { _id: id, availableCopies: { $gte: Math.abs(delta) } },
      { $inc: { totalCopies: delta, availableCopies: delta } },
      { new: true, runValidators: true }
    )

    if (!updated) throw new ApiError(409, 'Not enough available copies to complete that removal')

    await InventoryTransaction.create({
      type: delta > 0 ? 'acquire' : 'discard',
      book: updated._id,
      delta,
      availableDelta: delta,
      totalBefore: before.totalCopies,
      totalAfter: updated.totalCopies,
      availableBefore: before.availableCopies,
      availableAfter: updated.availableCopies,
      reason,
      actor: req.user._id,
    })

    await updated.populate(POPULATE)
    res.json({ book: serializeBook(updated) })
  })
)

export default router
