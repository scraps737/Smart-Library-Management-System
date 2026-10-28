/**
 * End-to-end API tests. They run against a real MongoDB instance using a
 * dedicated throwaway database, then remove everything they created.
 *
 *   npm test
 *
 * IMPORTANT: importing src/app.js runs dotenv.config(), which sets
 * process.env.MONGODB_URI from server/.env. The suite therefore must NOT derive
 * its URI from MONGODB_URI — doing so made it connect to the development
 * database and delete the user's catalogue. It uses a dedicated variable and
 * refuses to run against any database whose name does not look like a test DB.
 */
import test, { before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { createApp } from '../src/app.js'
import { connectDatabase, disconnectDatabase } from '../src/db.js'
import { User } from '../src/models/User.js'
import { Book } from '../src/models/Book.js'
import { Category } from '../src/models/Category.js'
import { Loan } from '../src/models/Loan.js'
import { InventoryTransaction } from '../src/models/InventoryTransaction.js'

const TEST_URI = process.env.ATHENAEUM_TEST_URI || 'mongodb://127.0.0.1:27017/athenaeum_test'

function databaseNameOf(uri) {
  return decodeURIComponent(uri.split('/').pop().split('?')[0] || '')
}

/**
 * Checks the URI name before anything connects, so a misconfiguration fails fast
 * and cleanly instead of leaving an open connection that hangs the runner.
 */
function assertDisposableUri(uri = TEST_URI) {
  const name = databaseNameOf(uri)
  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run the test suite against "${name}": the database name must contain "test". ` +
        `Set ATHENAEUM_TEST_URI to a disposable database.`
    )
  }
}

/** Second check against the database actually connected to, before any delete. */
function assertDisposableDatabase() {
  assertDisposableUri(`/${mongoose.connection.name || ''}`)
}

let server
let base

/** Tiny cookie-aware fetch helper. */
function makeClient() {
  let cookie = ''
  return async function call(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';')[0]
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }
    return { status: res.status, body: json }
  }
}

let categoryId
let bookId
let scholarLoanId

before(async () => {
  // Fail fast, before connecting, if this URI is not a disposable database.
  assertDisposableUri(TEST_URI)
  await connectDatabase(TEST_URI)
  // Re-check the database we actually landed on before deleting anything.
  assertDisposableDatabase()
  await Promise.all([
    User.deleteMany({}),
    Book.deleteMany({}),
    Category.deleteMany({}),
    Loan.deleteMany({}),
    InventoryTransaction.deleteMany({}),
  ])

  const category = await Category.create({ name: 'Natural Sciences', slug: 'natural-sciences', icon: 'science' })
  categoryId = category._id.toString()

  const book = await Book.create({
    title: 'Philosophiae Naturalis Principia Mathematica',
    author: 'Sir Isaac Newton',
    category: category._id,
    description: 'The mathematical principles of natural philosophy.',
    shelfmark: 'MS. BODL. 1687-NEWT',
    codexLanguage: 'Latin',
    totalCopies: 2,
    availableCopies: 2,
  })
  bookId = book._id.toString()

  await User.create({
    firstName: 'Ambrose',
    lastName: 'Whitlock',
    email: 'curator@test.athenaeum',
    role: 'librarian',
    passwordHash: await User.hashPassword('Athenaeum#2024'),
  })

  const app = createApp()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      assertDisposableDatabase()
      await Promise.all([
        User.deleteMany({}),
        Book.deleteMany({}),
        Category.deleteMany({}),
        Loan.deleteMany({}),
        InventoryTransaction.deleteMany({}),
      ])
    }
  } finally {
    // Always release the port and the connection so the runner never hangs.
    if (server) await new Promise((resolve) => server.close(resolve))
    await disconnectDatabase()
  }
})

describe('health', () => {
  test('responds to the health probe', async () => {
    const request = makeClient()
    const res = await request('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
  })
})

describe('authentication', () => {
  test('rejects a weak password with field-level detail', async () => {
    const request = makeClient()
    const res = await request('/auth/register', {
      method: 'POST',
      body: { firstName: 'A', lastName: 'B', email: 'weak@test.athenaeum', password: 'short' },
    })
    assert.equal(res.status, 422)
    assert.ok(res.body.details.some((d) => d.path === 'password'))
  })

  test('registers, persists a session and returns the profile', async () => {
    const request = makeClient()
    const res = await request('/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Vivian',
        lastName: 'Sterling',
        email: 'v.sterling@test.athenaeum',
        password: 'Athenaeum#2024',
        affiliation: 'Bodleian Libraries',
      },
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.role, 'scholar')

    const me = await request('/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.user.email, 'v.sterling@test.athenaeum')
  })

  test('refuses a duplicate email', async () => {
    const request = makeClient()
    const res = await request('/auth/register', {
      method: 'POST',
      body: { firstName: 'V', lastName: 'S', email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    assert.equal(res.status, 409)
  })

  test('rejects a wrong password without revealing which field failed', async () => {
    const request = makeClient()
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'not-the-password' },
    })
    assert.equal(res.status, 401)
    assert.match(res.body.error, /credentials/i)
  })

  test('requires authentication for private endpoints', async () => {
    const request = makeClient()
    const res = await request('/loans/me')
    assert.equal(res.status, 401)
  })
})

describe('catalogue', () => {
  test('searches and filters the catalogue', async () => {
    const request = makeClient()
    const all = await request('/books')
    assert.equal(all.status, 200)
    assert.equal(all.body.total, 1)

    const miss = await request('/books?search=zebra')
    assert.equal(miss.body.total, 0)

    const bySlug = await request('/books?category=natural-sciences')
    assert.equal(bySlug.body.total, 1)

    const unavailable = await request('/books?availability=unavailable')
    assert.equal(unavailable.body.total, 0)
  })

  test('exposes live facet counts', async () => {
    const request = makeClient()
    const res = await request('/books/filters')
    assert.equal(res.status, 200)
    assert.equal(res.body.categories[0].count, 1)
    assert.ok(res.body.languages.some((l) => l.value === 'Latin'))
    assert.ok(res.body.accessTiers.length > 0)
  })

  test('returns a single record with related context', async () => {
    const request = makeClient()
    const res = await request(`/books/${bookId}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.book.id, bookId)
    assert.ok(Array.isArray(res.body.related))
    assert.equal(res.body.myActiveLoan, null)
  })

  test('404s for an unknown identifier', async () => {
    const request = makeClient()
    const res = await request('/books/0123456789abcdef01234567')
    assert.equal(res.status, 404)
  })
})

describe('authorisation', () => {
  test('blocks a scholar from the staff circulation desk', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request('/loans')
    assert.equal(res.status, 403)
  })

  test('blocks a scholar from adjusting stock', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/books/${bookId}/stock`, {
      method: 'POST',
      body: { delta: 5, reason: 'unauthorised attempt by a scholar role' },
    })
    assert.equal(res.status, 403)
  })

  test('blocks a scholar from the analytics endpoint', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request('/analytics/overview')
    // Authenticated but under-privileged: 403 (401 is for no session at all).
    assert.equal(res.status, 403)
  })
})

describe('circulation', () => {
  test('borrows a copy and decrements availability', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })

    const res = await request('/loans', { method: 'POST', body: { bookId } })
    assert.equal(res.status, 201)
    scholarLoanId = res.body.loan.id

    const book = await request(`/books/${bookId}`)
    assert.equal(book.body.book.availableCopies, 1)
    assert.equal(book.body.myActiveLoan.id, scholarLoanId)
  })

  test('refuses a duplicate active loan of the same title', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request('/loans', { method: 'POST', body: { bookId } })
    assert.equal(res.status, 409)
  })

  test('renews an active loan', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const before = await request('/loans/me')
    const originalDue = before.body.active[0].dueDate

    const res = await request(`/loans/${scholarLoanId}/renew`, { method: 'POST' })
    assert.equal(res.status, 200)
    assert.equal(res.body.loan.renewals, 1)
    assert.ok(new Date(res.body.loan.dueDate) > new Date(originalDue))
  })

  test('prevents two scholars from taking the same last copy', async () => {
    // Register a second scholar and have both contend for the single remaining copy.
    const second = makeClient()
    await second('/auth/register', {
      method: 'POST',
      body: { firstName: 'Julian', lastName: 'Vance', email: 'j.vance@test.athenaeum', password: 'Athenaeum#2024' },
    })

    const results = await Promise.all([
      second('/loans', { method: 'POST', body: { bookId } }),
      (async () => {
        const third = makeClient()
        await third('/auth/register', {
          method: 'POST',
          body: { firstName: 'Marisol', lastName: 'Kenner', email: 'm.kenner@test.athenaeum', password: 'Athenaeum#2024' },
        })
        return third('/loans', { method: 'POST', body: { bookId } })
      })(),
    ])

    const created = results.filter((r) => r.status === 201).length
    const refused = results.filter((r) => r.status === 409).length
    assert.equal(created, 1, 'exactly one request may claim the last copy')
    assert.equal(refused, 1, 'the other request must be refused')

    const book = await Book.findById(bookId)
    assert.equal(book.availableCopies, 0)
    assert.equal(book.totalCopies - book.availableCopies, await Loan.countDocuments({ book: bookId, status: 'active' }))
  })

  test('returns a copy and restores availability', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/loans/${scholarLoanId}/return`, { method: 'POST' })
    assert.equal(res.status, 200)
    assert.equal(res.body.loan.status, 'returned')

    const book = await Book.findById(bookId)
    assert.equal(book.availableCopies, 1)
  })

  test('refuses to return the same loan twice', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'v.sterling@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/loans/${scholarLoanId}/return`, { method: 'POST' })
    assert.equal(res.status, 409)
  })
})

describe('inventory', () => {
  test('staff can accession copies and the ledger records it', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'curator@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/books/${bookId}/stock`, {
      method: 'POST',
      body: { delta: 2, reason: 'Two replacement copies acquired from the Basel facsimile programme' },
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.book.totalCopies, 4)
    assert.equal(res.body.book.availableCopies, 3)

    const ledger = await InventoryTransaction.findOne({ book: bookId, type: 'acquire', delta: 2 })
    assert.ok(ledger)
    assert.equal(ledger.totalBefore, 2)
    assert.equal(ledger.totalAfter, 4)
  })

  test('refuses to remove copies that are out on loan', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'curator@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/books/${bookId}/stock`, {
      method: 'POST',
      body: { delta: -999, reason: 'Attempting an impossible write-off for the consistency test' },
    })
    assert.equal(res.status, 409)
  })

  test('requires a reason for the audit ledger', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'curator@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request(`/books/${bookId}/stock`, {
      method: 'POST',
      body: { delta: 1, reason: 'x' },
    })
    assert.equal(res.status, 422)
  })

  test('keeps availability within the total after any sequence of movements', async () => {
    const book = await Book.findById(bookId)
    const active = await Loan.countDocuments({ book: bookId, status: 'active' })
    assert.ok(book.availableCopies >= 0, 'available copies may never go negative')
    assert.ok(book.availableCopies <= book.totalCopies, 'available copies may never exceed the total')
    assert.equal(book.totalCopies - book.availableCopies, active, 'on-loan copies must equal active loans')
  })
})

describe('analytics', () => {
  test('staff receive aggregates derived from live data', async () => {
    const request = makeClient()
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'curator@test.athenaeum', password: 'Athenaeum#2024' },
    })
    const res = await request('/analytics/overview')
    assert.equal(res.status, 200)

    const book = await Book.findById(bookId)
    assert.equal(res.body.kpis.titles, 1)
    assert.equal(res.body.kpis.totalCopies, book.totalCopies)
    assert.equal(res.body.kpis.availableCopies, book.availableCopies)
    assert.equal(res.body.kpis.onLoan, await Loan.countDocuments({ book: bookId, status: 'active' }))
    assert.ok(Array.isArray(res.body.byCategory))
    assert.ok(Array.isArray(res.body.recentLedger))
  })
})
