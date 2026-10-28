const BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  let payload = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { error: text }
    }
  }

  if (!res.ok) {
    const message = payload?.error || `Request failed (${res.status})`
    const details = payload?.details
    const err = new ApiError(res.status, message, details)
    err.fieldErrors = Array.isArray(details)
      ? Object.fromEntries(details.map((d) => [d.path, d.message]))
      : {}
    throw err
  }
  return payload
}

const qs = (params) => {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') search.set(k, v)
  })
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  health: () => request('/health'),

  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  books: (params) => request(`/books${qs(params)}`),
  bookFilters: () => request('/books/filters'),
  book: (id) => request(`/books/${id}`),
  createBook: (payload) => request('/books', { method: 'POST', body: payload }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PATCH', body: payload }),
  adjustStock: (id, payload) => request(`/books/${id}/stock`, { method: 'POST', body: payload }),

  borrow: (bookId) => request('/loans', { method: 'POST', body: { bookId } }),
  myLoans: () => request('/loans/me'),
  loans: (params) => request(`/loans${qs(params)}`),
  returnLoan: (id, notes) => request(`/loans/${id}/return`, { method: 'POST', body: { notes } }),
  renewLoan: (id) => request(`/loans/${id}/renew`, { method: 'POST' }),

  categories: () => request('/categories'),
  category: (slug) => request(`/categories/${slug}`),

  analytics: () => request('/analytics/overview'),

  profile: () => request('/profile'),
  updateProfile: (payload) => request('/profile', { method: 'PATCH', body: payload }),
  toggleBookmark: (bookId) => request(`/profile/bookmarks/${bookId}`, { method: 'POST' }),
  bookmarkState: (bookId) => request(`/profile/bookmarks/${bookId}`),
}
