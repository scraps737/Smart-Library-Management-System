import { createApp } from './app.js'
import { config } from './config.js'
import { connectDatabase } from './db.js'

async function start() {
  try {
    await connectDatabase()
    // eslint-disable-next-line no-console
    console.log(`[athenaeum] connected to MongoDB (${config.mongoUri.replace(/\/\/.*@/, '//')})`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[athenaeum] could not reach MongoDB: ${err.message}`)
    // eslint-disable-next-line no-console
    console.error('[athenaeum] start a database, or set MONGODB_URI in server/.env')
    process.exit(1)
  }

  const app = createApp()
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[athenaeum] API listening on http://localhost:${config.port}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `[athenaeum] port ${config.port} is already in use.\n` +
          `[athenaeum] stop that process, or change PORT in server/.env (or run: PORT=4200 npm start)`
      )
    } else {
      // eslint-disable-next-line no-console
      console.error(`[athenaeum] server error: ${err.message}`)
    }
    process.exit(1)
  })
}

start()
