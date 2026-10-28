#!/usr/bin/env node
/**
 * One command to run the whole prototype:  npm start
 *
 *   1. creates server/.env (with a generated JWT secret) if it is missing
 *   2. installs dependencies if they are missing
 *   3. starts MongoDB if nothing is listening on the port already
 *   4. seeds the catalogue, but only when the database is empty
 *   5. runs the API and the web client together
 *
 * Ctrl-C stops everything, including the MongoDB this script started.
 *
 * Ports: API defaults to 4110 and the web app to 5180 so they do not collide
 * with another project on the usual 4000/5173. Override with API_PORT,
 * WEB_PORT or MONGO_PORT.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(root, 'server', '.env')
const DB_PATH = path.join(root, '.data', 'mongodb')

const readEnvValue = (key) => {
  if (!existsSync(ENV_FILE)) return null
  const match = readFileSync(ENV_FILE, 'utf8').match(new RegExp(`^\\s*${key}\\s*=(.*)$`, 'm'))
  return match ? match[1].trim() : null
}

const MONGO_PORT = Number(process.env.MONGO_PORT || 27017)
const API_PORT = Number(process.env.API_PORT || readEnvValue('PORT') || 4110)
const WEB_PORT = Number(process.env.WEB_PORT || 5180)
const MONGO_URI = process.env.MONGODB_URI || readEnvValue('MONGODB_URI') || ''

const log = (msg) => console.log(`\x1b[36m[athenaeum]\x1b[0m ${msg}`)
const die = (msg) => {
  console.error(`\x1b[36m[athenaeum]\x1b[0m \x1b[31m${msg}\x1b[0m`)
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const finish = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(600)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function waitForPort(port, label) {
  for (let i = 0; i < 60; i += 1) {
    if (await portInUse(port)) return
    await sleep(400)
  }
  die(`${label} never came up on port ${port}`)
}

/* ------------------------------------------------------------------ cleanup */

let mongoProcess = null
let runner = null
let stopping = false

function stop() {
  if (stopping) return
  stopping = true
  if (runner) runner.kill('SIGTERM')
  if (mongoProcess) mongoProcess.kill('SIGTERM')
}

process.on('SIGINT', () => {
  stop()
  setTimeout(() => process.exit(0), 800).unref()
})
process.on('SIGTERM', () => {
  stop()
  setTimeout(() => process.exit(0), 800).unref()
})

/* -------------------------------------------------------------- setup steps */

function ensureEnvFile() {
  const example = path.join(root, 'server', '.env.example')
  const existed = existsSync(ENV_FILE)
  if (!existed && !existsSync(example)) die('server/.env.example is missing')

  let contents = readFileSync(existed ? ENV_FILE : example, 'utf8')

  // Replace a missing or placeholder secret with a real one.
  if (/^JWT_SECRET=\s*(replace-with-a-long-random-secret)?\s*$/m.test(contents)) {
    contents = contents.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`)
    writeFileSync(ENV_FILE, contents)
    log(existed ? 'generated the missing JWT secret in server/.env' : 'created server/.env with a generated JWT secret')
    return
  }
  if (!existed) {
    writeFileSync(ENV_FILE, contents)
    log('created server/.env')
  }
}

function ensureDependencies() {
  const missing =
    !existsSync(path.join(root, 'client', 'node_modules', 'vite')) ||
    !existsSync(path.join(root, 'server', 'node_modules', 'express')) ||
    !existsSync(path.join(root, 'node_modules', 'concurrently'))
  if (!missing) return
  log('installing dependencies (first run, this takes a minute)…')
  const result = spawnSync('npm', ['install', '--include=dev'], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) die('dependency installation failed')
}

async function ensureMongo() {
  // If MONGODB_URI points at another host, that server is not ours to manage.
  const host = MONGO_URI.replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@]*@/, '')
    .split(/[/,:]/)[0]
  if (host && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    log(`using the MongoDB at ${host} (from MONGODB_URI)`)
    return
  }

  if (await portInUse(MONGO_PORT)) {
    log(`using the MongoDB already running on port ${MONGO_PORT}`)
    return
  }
  const probe = spawnSync('mongod', ['--version'], { stdio: 'ignore' })
  if (probe.error) {
    die(
      'MongoDB is not installed.\n' +
        '         macOS: brew tap mongodb/brew && brew install mongodb-community\n' +
        '         Or point MONGODB_URI in server/.env at an existing server.'
    )
  }
  mkdirSync(DB_PATH, { recursive: true })
  log(`starting MongoDB on port ${MONGO_PORT}`)
  mongoProcess = spawn(
    'mongod',
    ['--dbpath', DB_PATH, '--port', String(MONGO_PORT), '--bind_ip', '127.0.0.1', '--quiet'],
    { stdio: 'ignore' }
  )
  await waitForPort(MONGO_PORT, 'MongoDB')
}

function seedIfEmpty() {
  const result = spawnSync('node', ['src/seed.js', '--if-empty'], {
    cwd: path.join(root, 'server'),
    // Force development so an ambient NODE_ENV=production cannot block seeding.
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: 'inherit',
  })
  if (result.status !== 0) log('seeding reported a problem — continuing with existing data')
}

async function startApps() {
  if (await portInUse(API_PORT)) die(`port ${API_PORT} is busy. Stop it, or run: API_PORT=4200 npm start`)
  if (await portInUse(WEB_PORT)) die(`port ${WEB_PORT} is busy. Stop it, or run: WEB_PORT=5200 npm start`)

  console.log(`
  Athenaeum is starting up

    Web app   http://localhost:${WEB_PORT}
    API       http://localhost:${API_PORT}/api/health
    MongoDB   mongodb://127.0.0.1:${MONGO_PORT}/athenaeum

    Scholar   v.sterling@athenaeum-fellows.edu / Athenaeum#2024
    Staff     curator@athenaeum.edu / Athenaeum#2024

`)

  runner = spawn(
    path.join(root, 'node_modules', '.bin', 'concurrently'),
    [
      '--kill-others',
      '--names',
      'api,web',
      '--prefix-colors',
      'green,blue',
      'npm --prefix server run dev',
      'npm --prefix client run dev',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Forced so an ambient NODE_ENV=production cannot make the API serve the
        // built bundle instead of behaving like a dev server.
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        VITE_API_PROXY: `http://localhost:${API_PORT}`,
      },
    }
  )

  await waitForPort(API_PORT, 'the API')

  runner.on('exit', (code) => {
    stop()
    process.exit(code ?? 0)
  })
}

/* --------------------------------------------------------------------- main */

ensureEnvFile()
ensureDependencies()
await ensureMongo()
seedIfEmpty()
await startApps()
