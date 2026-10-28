/** Shared zod schemas used by the API routes. */
import { z } from 'zod'

export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid identifier')

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol')

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Family name is required').max(80),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: passwordSchema,
  affiliation: z.string().trim().max(160).optional().default(''),
  discipline: z.string().trim().max(160).optional().default(''),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  affiliation: z.string().trim().max(160).optional(),
  discipline: z.string().trim().max(160).optional(),
})

export const bookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  subtitle: z.string().trim().max(200).optional().default(''),
  author: z.string().trim().min(1, 'Author is required').max(160),
  authorDates: z.string().trim().max(60).optional().default(''),
  category: objectId,
  description: z.string().trim().min(1, 'Description is required').max(4000),
  excerpt: z.string().trim().max(1000).optional().default(''),
  coverImage: z.string().trim().max(400).optional(),
  publishedYear: z.coerce.number().int().min(1).max(2100).optional(),
  publisher: z.string().trim().max(200).optional().default(''),
  codexLanguage: z.string().trim().max(80).optional().default('Latin'),
  pages: z.coerce.number().int().min(1).max(20000).optional(),
  shelfmark: z.string().trim().max(120).optional().default(''),
  callNumber: z.string().trim().max(120).optional().default(''),
  collectionName: z.string().trim().max(160).optional().default(''),
  accessTier: z.string().trim().max(80).optional(),
  digitalFidelity: z.string().trim().max(80).optional(),
  location: z.string().trim().max(160).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(10).optional().default([]),
  rating: z.coerce.number().min(0).max(5).optional(),
  citationCount: z.coerce.number().int().min(0).optional(),
  totalCopies: z.coerce.number().int().min(0).max(5000),
  availableCopies: z.coerce.number().int().min(0).max(5000).optional(),
  featured: z.coerce.boolean().optional(),
})

export const bookUpdateSchema = bookSchema.partial()

export const stockSchema = z.object({
  delta: z.coerce.number().int().refine((v) => v !== 0, 'Adjustment must be non-zero'),
  reason: z.string().trim().min(3, 'A reason is required for the audit ledger').max(300),
})
