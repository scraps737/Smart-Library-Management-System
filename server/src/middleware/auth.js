import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { User } from '../models/User.js'

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

export function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' })
}

async function resolveUser(req) {
  const token = req.cookies?.[config.cookieName]
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    return await User.findById(payload.sub)
  } catch {
    return null
  }
}

/** Rejects the request when no valid session is present. */
export async function requireAuth(req, res, next) {
  const user = await resolveUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  req.user = user
  next()
}

/** Attaches req.user when a session exists, but never rejects. */
export async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req)
  next()
}

/** Server-side authorisation. A frontend-only role check is never sufficient. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient privileges for this operation' })
    }
    next()
  }
}
