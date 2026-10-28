import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User.js'
import { registerSchema, loginSchema } from '../validation/schemas.js'
import { asyncHandler, ApiError } from '../middleware/errors.js'
import { requireAuth, setAuthCookie, clearAuthCookie, signToken } from '../middleware/auth.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
})

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body)

    const existing = await User.findOne({ email: data.email })
    if (existing) throw new ApiError(409, 'An account already exists for that email address')

    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      affiliation: data.affiliation,
      discipline: data.discipline,
      passwordHash: await User.hashPassword(data.password),
      role: 'scholar',
    })

    setAuthCookie(res, signToken(user))
    res.status(201).json({ user: user.toSafeJSON() })
  })
)

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)

    const user = await User.findOne({ email }).select('+passwordHash')
    // Same message for unknown email and wrong password — no account enumeration.
    if (!user || !(await user.verifyPassword(password))) {
      throw new ApiError(401, 'Those credentials do not match our registry')
    }

    setAuthCookie(res, signToken(user))
    res.json({ user: user.toSafeJSON() })
  })
)

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toSafeJSON() })
  })
)

export default router
