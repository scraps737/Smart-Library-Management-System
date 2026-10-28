import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { errorHandler, notFound } from './middleware/errors.js'
import authRoutes from './routes/auth.js'
import bookRoutes from './routes/books.js'
import loanRoutes from './routes/loans.js'
import categoryRoutes from './routes/categories.js'
import analyticsRoutes from './routes/analytics.js'
import profileRoutes from './routes/profile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(
    cors({
      origin: config.isProd ? false : config.clientOrigin,
      credentials: true,
    })
  )

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'athenaeum-api', time: new Date().toISOString() })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/books', bookRoutes)
  app.use('/api/loans', loanRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api/profile', profileRoutes)

  // In production the built SPA is served by this same process.
  if (config.isProd) {
    const clientDist = path.resolve(__dirname, '../../client/dist')
    app.use(express.static(clientDist))
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use('/api', notFound)
  app.use(errorHandler)

  return app
}
