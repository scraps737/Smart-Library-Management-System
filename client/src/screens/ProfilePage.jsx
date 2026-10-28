import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorState, LoadingBlock } from '../components/StateBlocks'
import { BookThumb } from '../components/BookCard'
import { formatDate, relativeDays } from '../lib/format'

const DISCIPLINES = [
  'Medieval & Byzantine Manuscript Studies',
  'Early Modern Print & Incunabula',
  'History of Science & Natural Philosophy',
  'Classical Papyrology & Epigraphy',
  'Historical Cartography & Navigation',
  'Independent Humanist Research',
]

const inputClass =
  'w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)] transition-all'

export default function ProfilePage() {
  const { refresh } = useAuth()
  const toast = useToast()
  const location = useLocation()

  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', affiliation: '', discipline: '' })
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api
      .profile()
      .then((data) => {
        setState({ status: 'ready', data, error: '' })
        setForm({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          affiliation: data.user.affiliation || '',
          discipline: data.user.discipline || '',
        })
      })
      .catch((err) => setState({ status: 'error', data: null, error: err.message }))
  }, [])

  useEffect(load, [load])

  // Deep-link support: /profile#saved-titles scrolls to the saved shelf.
  useEffect(() => {
    if (state.status !== 'ready') return
    const hash = location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, state.status])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        affiliation: form.affiliation.trim(),
        discipline: form.discipline,
      }
      await api.updateProfile(payload)
      await refresh()
      toast.success('Scholar record updated.')
      setEditing(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function returnLoan(loanId, title) {
    setBusy(true)
    try {
      await api.returnLoan(loanId)
      toast.success(`“${title}” returned. The copy is back on the shelf.`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function renewLoan(loanId) {
    setBusy(true)
    try {
      const res = await api.renewLoan(loanId)
      toast.success(`Loan renewed — due ${formatDate(res.loan.dueDate)}.`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeBookmark(bookId, title) {
    try {
      await api.toggleBookmark(bookId)
      await refresh()
      toast.success(`Removed “${title}” from your saved shelf.`)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <LoadingBlock label="Opening your scholar dossier…" rows={4} />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <ErrorState message={state.error} onRetry={load} />
      </div>
    )
  }

  const { user: profile, activeLoans, history, bookmarks, stats } = state.data

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">badge</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-medium">Scholar Dossier</span>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-semibold">
          {profile.fullName} ({profile.membershipTier} · {profile.role})
        </span>
      </nav>

      <header className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col lg:flex-row gap-space-lg items-start lg:items-center justify-between">
        <div className="flex items-start sm:items-center gap-space-md">
          <img
            alt={`${profile.fullName} portrait`}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover ring-2 ring-parchment shadow-sm"
            src={profile.avatarUrl || '/assets/scholar-portrait.png'}
            onError={(e) => {
              e.currentTarget.src = '/assets/scholar-portrait.png'
            }}
          />
          <div>
            <div className="flex items-center gap-space-sm flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
                {profile.membershipTier}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brass-accent animate-pulse" />
                Registry Node #{profile.id.slice(-3).toUpperCase()}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-walnut-dark">{profile.fullName}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              {profile.discipline || 'Discipline not recorded'}
              {profile.affiliation ? ` • ${profile.affiliation}` : ''}
            </p>
            <p className="font-body-sm text-body-sm text-outline mt-1">{profile.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">{editing ? 'close' : 'edit'}</span>
            {editing ? 'Cancel edit' : 'Edit dossier'}
          </button>
          <Link
            to="/catalog"
            className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            Browse catalogue
          </Link>
        </div>
      </header>

      {editing && (
        <form className="mt-space-md bg-surface-container-lowest rounded-xl shadow-sm p-space-lg animate-fade-in-up" onSubmit={saveProfile}>
          <h2 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-md">Archival Record & Workspace</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark">First name</span>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark">Family name</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark">Primary affiliation</span>
              <input
                value={form.affiliation}
                onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Bodleian Libraries, University of Oxford"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark">Research specialisation</span>
              <select
                value={form.discipline}
                onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select a specialisation</option>
                {[...new Set([form.discipline, ...DISCIPLINES].filter(Boolean))].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center justify-end gap-space-sm mt-space-md">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save dossier'}
            </button>
          </div>
        </form>
      )}

      {/* Reading statistics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-lg">
        {[
          ['Active Loans', stats.active, 'swap_horiz', 'Copies currently in your custody'],
          ['Overdue', stats.overdue, 'report', 'Return at the circulation desk'],
          ['Completed Returns', stats.returned, 'assignment_turned_in', 'In your reading history'],
          ['Saved Titles', stats.bookmarks, 'bookmark', 'On your reserve shelf'],
        ].map(([label, value, icon, sub], i) => (
          <div key={label} className={`p-space-md rounded-xl shadow-sm ${i === 1 && value > 0 ? 'bg-error-container/40 ring-1 ring-error/20' : 'bg-surface-container-lowest'}`}>
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
              <span className={`material-symbols-outlined text-[20px] ${i === 1 && value > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                {icon}
              </span>
            </div>
            <span className={`font-display text-display ${i === 1 && value > 0 ? 'text-error' : 'text-walnut-dark'}`}>
              {value}
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{sub}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start mt-space-lg">
        {/* Current borrowing */}
        <section className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="flex items-center justify-between mb-space-md gap-2 flex-wrap">
            <h2 className="font-headline-md text-headline-md text-walnut-dark">Current Borrowing & Reserve Shelf</h2>
            <Link to="/circulation" className="font-label-sm text-label-sm text-brass-muted hover:text-secondary uppercase tracking-wider">
              Full ledger →
            </Link>
          </div>

          {activeLoans.length === 0 ? (
            <EmptyState
              icon="library_books"
              title="No copies in your custody"
              body="Borrow a folio from the catalogue and its due date will appear here, along with renew and return actions."
              action={
                <Link
                  to="/catalog"
                  className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
                >
                  Browse the catalogue
                </Link>
              }
            />
          ) : (
            <div className="space-y-space-md">
              {activeLoans.map((loan) => (
                <article
                  key={loan.id}
                  className={`flex flex-col sm:flex-row gap-space-md p-space-md rounded-xl ${
                    loan.isOverdue ? 'bg-error-container/25 ring-1 ring-error/20' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="w-full sm:w-28 shrink-0">
                    <div className="aspect-[4/5] rounded-lg overflow-hidden bg-parchment shadow-sm">
                      <img
                        className="w-full h-full object-cover"
                        src={loan.book?.coverImage}
                        alt={`Cover of ${loan.book?.title}`}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/stitch/ab2120dc13.jpg'
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between gap-space-sm">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider ${
                            loan.isOverdue
                              ? 'bg-error text-on-error'
                              : loan.isDueSoon
                                ? 'bg-secondary-container/80 text-on-secondary-fixed'
                                : 'bg-surface-container text-walnut-dark'
                          }`}
                        >
                          {loan.isOverdue ? `${loan.daysOverdue} days overdue` : loan.isDueSoon ? 'Due soon' : 'On loan'}
                        </span>
                        {loan.renewals > 0 && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                            Renewed ×{loan.renewals}
                          </span>
                        )}
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-walnut-dark mt-1 italic">
                        <Link to={`/books/${loan.book?.id}`} className="hover:text-brass-muted transition-colors">
                          {loan.book?.title}
                        </Link>
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {loan.book?.author} • {loan.book?.shelfmark}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Borrowed {formatDate(loan.borrowedAt)} • Due {formatDate(loan.dueDate)} ({relativeDays(loan.dueDate)})
                      </p>
                    </div>
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => returnLoan(loan.id, loan.book?.title)}
                        className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors disabled:opacity-60"
                      >
                        Return copy
                      </button>
                      <button
                        type="button"
                        disabled={busy || loan.isOverdue}
                        onClick={() => renewLoan(loan.id)}
                        className="px-space-md py-2 rounded-lg bg-parchment hover:bg-surface-container text-brass-muted font-label-sm text-label-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Renew loan
                      </button>
                      <Link
                        to={`/books/${loan.book?.id}`}
                        className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-walnut-dark font-label-sm text-label-sm transition-colors"
                      >
                        Open record
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Saved shelf */}
        <section className="lg:col-span-4 space-y-space-md" id="saved-titles">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="font-headline-md text-headline-md text-walnut-dark">Reserve Shelf</h2>
              <span className="font-label-sm text-label-sm text-brass-muted uppercase tracking-wider">
                {bookmarks.length} saved
              </span>
            </div>
            {bookmarks.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Nothing saved yet. Use the bookmark control on any catalogue record to add it to your reserve shelf.
              </p>
            ) : (
              <ul className="space-y-space-sm">
                {bookmarks.map((b) => (
                  <li key={b.id} className="flex items-center gap-space-sm">
                    <BookThumb book={b} to={`/books/${b.id}`} subtitle={b.author} />
                    <button
                      type="button"
                      onClick={() => removeBookmark(b.id, b.title)}
                      className="ml-auto shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-parchment transition-colors"
                      title="Remove from reserve shelf"
                      aria-label={`Remove ${b.title} from reserve shelf`}
                    >
                      <span className="material-symbols-outlined text-[18px]">bookmark_remove</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-primary-container text-parchment rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center gap-2 mb-space-xs">
              <span className="material-symbols-outlined text-brass-accent text-[20px]">support_agent</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-accent">
                Vault Curator On-Call
              </span>
            </div>
            <p className="font-body-md text-body-md text-parchment/80 leading-relaxed">
              Need a folio recalled from the vault, or a reading-room carrel reserved? The curator on duty can arrange
              either from the circulation desk.
            </p>
            <Link
              to="/circulation"
              className="mt-space-md inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-brass-accent text-walnut-dark font-label-md text-label-md font-semibold hover:bg-brass-muted hover:text-on-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Contact the desk
            </Link>
          </div>
        </section>
      </div>

      {/* History */}
      <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
        <div className="flex items-center justify-between mb-space-md gap-2 flex-wrap">
          <h2 className="font-headline-md text-headline-md text-walnut-dark">Account Activity & Archival Ledger</h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {history.length} completed {history.length === 1 ? 'loan' : 'loans'}
          </span>
        </div>
        {history.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No completed loans yet. Your return history will build here as you work through the collection.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-parchment/70">
                <tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4 font-semibold">Folio</th>
                  <th className="py-3 px-4 font-semibold">Borrowed</th>
                  <th className="py-3 px-4 font-semibold">Returned</th>
                  <th className="py-3 px-4 font-semibold">Held for</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.map((l) => {
                  const days = Math.max(
                    0,
                    Math.round((new Date(l.returnedAt).getTime() - new Date(l.borrowedAt).getTime()) / 86400000)
                  )
                  return (
                    <tr key={l.id} className="hover:bg-parchment/40 transition-colors">
                      <td className="py-3 px-4">
                        <BookThumb book={l.book} to={`/books/${l.book?.id}`} subtitle={l.book?.author} />
                      </td>
                      <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                        {formatDate(l.borrowedAt)}
                      </td>
                      <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                        {formatDate(l.returnedAt)}
                      </td>
                      <td className="py-3 px-4 font-body-sm text-body-sm text-charcoal-text whitespace-nowrap">
                        {days} {days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/books/${l.book?.id}`}
                          className="font-label-sm text-label-sm text-brass-muted hover:text-secondary uppercase tracking-wider"
                        >
                          Borrow again
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
        <h2 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-sm">Security & Session</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="bg-surface-container-low rounded-lg p-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block mb-1">Role</span>
            <span className="font-label-lg text-label-lg text-walnut-dark capitalize">{profile.role}</span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block mb-1">
              Session type
            </span>
            <span className="font-label-lg text-label-lg text-walnut-dark">
              HTTP-only secure cookie (expires after 7 days)
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block mb-1">
              Member since
            </span>
            <span className="font-label-lg text-label-lg text-walnut-dark">{formatDate(profile.createdAt)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
