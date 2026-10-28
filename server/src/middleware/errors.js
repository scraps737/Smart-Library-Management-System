import { ZodError } from 'zod'
import { config } from '../config.js'

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

/** Wraps async route handlers so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function notFound(req, res) {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` })
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  if (err?.name === 'ValidationError') {
    return res.status(422).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    })
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'A record with those unique details already exists' })
  }

  const status = err.status || 500
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[athenaeum] unhandled error:', err)
  }
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
    ...(!config.isProd && status >= 500 ? { stack: err.stack } : {}),
  })
}
