import dotenv from 'dotenv'

dotenv.config()

const isProd = process.env.NODE_ENV === 'production'
const DEFAULT_SECRET = 'athenaeum-dev-secret-change-me'

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_SECRET)) {
  // Fail loudly rather than silently shipping a known signing key.
  throw new Error('JWT_SECRET must be set to a unique value when NODE_ENV=production')
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/athenaeum',
  jwtSecret: process.env.JWT_SECRET || DEFAULT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'athenaeum_session',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  loanPeriodDays: Number(process.env.LOAN_PERIOD_DAYS || 21),
  maxRenewals: Number(process.env.MAX_RENEWALS || 2),
}
