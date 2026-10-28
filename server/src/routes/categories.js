import { Router } from 'express'
import { Category } from '../models/Category.js'
import { Book } from '../models/Book.js'
import { asyncHandler, ApiError } from '../middleware/errors.js'
import { serializeBook } from '../services/books.js'

const router = Router()

/** GET /api/categories — disciplines with live catalogue counts. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ order: 1, name: 1 })

    const counts = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          titles: { $sum: 1 },
          copies: { $sum: '$totalCopies' },
          available: { $sum: '$availableCopies' },
        },
      },
    ])
    const byId = new Map(counts.map((c) => [c._id?.toString(), c]))

    res.json({
      items: categories.map((c) => {
        const stat = byId.get(c._id.toString()) || { titles: 0, copies: 0, available: 0 }
        return {
          id: c._id.toString(),
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          image: c.image,
          collectionNote: c.collectionNote,
          titleCount: stat.titles,
          copyCount: stat.copies,
          availableCount: stat.available,
        }
      }),
    })
  })
)

/** GET /api/categories/:slug — one discipline plus its catalogue slice. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const category = await Category.findOne({ slug: req.params.slug })
    if (!category) throw new ApiError(404, 'Discipline not found')

    const books = await Book.find({ category: category._id })
      .populate({ path: 'category', select: 'name slug icon' })
      .sort({ featured: -1, title: 1 })
      .limit(24)

    res.json({
      category: {
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        image: category.image,
        collectionNote: category.collectionNote,
        titleCount: books.length,
      },
      books: books.map((b) => serializeBook(b)),
    })
  })
)

export default router
