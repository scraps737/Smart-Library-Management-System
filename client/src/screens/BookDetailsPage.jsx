import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorState, LoadingBlock } from '../components/StateBlocks'
import { AvailabilityPill } from '../components/BookCard'
import { formatDate, relativeDays } from '../lib/format'

const SCANS = [
  { id: 'VIS', label: 'Visible Light Scan', filter: 'none' },
  { id: 'UV', label: 'Ultraviolet Multispectral', filter: 'saturate(1.4) hue-rotate(200deg) contrast(1.1)' },
  { id: 'IR', label: 'Infrared Reflectography', filter: 'grayscale(0.6) contrast(1.25) brightness(1.05)' },
]

const TABS = [
  { id: 'synopsis', label: 'Synopsis & Excerpt', icon: 'menu_book' },
  { id: 'codicology', label: 'Physical Codicology & Provenance', icon: 'history_edu' },
  { id: 'circulation', label: 'Circulation & Holdings', icon: 'local_library' },
  { id: 'related', label: 'Concordances & Lineage', icon: 'hub' },
]

function download(filename, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function bibtexFor(book) {
  const key = `${(book.author || 'anon').split(/\s+/).pop().toLowerCase()}${book.publishedYear || ''}`
  return `@book{${key},
  title     = {${book.title}},
  author    = {${book.author}},
  year      = {${book.publishedYear || 'n.d.'}},
  publisher = {${book.publisher || 'Athenaeum Digital Repository'}},
  address   = {${book.location || ''}},
  note      = {Shelfmark ${book.shelfmark}. Athenaeum Smart Digital Library.},
  language  = {${book.codexLanguage || ''}}
}
`
}

function risFor(book) {
  return [
    'TY  - BOOK',
    `TI  - ${book.title}`,
    `AU  - ${book.author}`,
    `PY  - ${book.publishedYear || ''}`,
    `PB  - ${book.publisher || 'Athenaeum Digital Repository'}`,
    `LA  - ${book.codexLanguage || ''}`,
    `KW  - ${(book.tags || []).join(', ')}`,
    `N1  - Shelfmark: ${book.shelfmark}`,
    'ER  - ',
  ].join('\n')
}

export default function BookDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, refresh } = useAuth()
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', book: null, related: [], myActiveLoan: null, error: '' })
  const [scan, setScan] = useState('VIS')
  const [tab, setTab] = useState('synopsis')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      const res = await api.book(id)
      setState({ status: 'ready', book: res.book, related: res.related, myActiveLoan: res.myActiveLoan, error: '' })
    } catch (err) {
      setState({ status: 'error', book: null, related: [], myActiveLoan: null, error: err.message })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return setSaved(false)
    api
      .bookmarkState(id)
      .then((r) => setSaved(r.saved))
      .catch(() => setSaved(false))
  }, [id, isAuthenticated])

  const book = state.book
  const scanFilter = useMemo(() => SCANS.find((s) => s.id === scan)?.filter || 'none', [scan])

  async function handleBorrow() {
    if (!isAuthenticated) {
      toast.info('Sign in to borrow a copy from the archive.')
      return navigate('/login', { state: { from: `/books/${id}` } })
    }
    setBusy(true)
    try {
      const res = await api.borrow(book.id)
      toast.success(`Copy reserved. Due back ${formatDate(res.loan.dueDate)}.`)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReturn() {
    setBusy(true)
    try {
      await api.returnLoan(state.myActiveLoan.id)
      toast.success('Copy returned to the vault. Thank you.')
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRenew() {
    setBusy(true)
    try {
      const res = await api.renewLoan(state.myActiveLoan.id)
      toast.success(`Loan renewed. New due date ${formatDate(res.loan.dueDate)}.`)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleBookmark() {
    if (!isAuthenticated) {
      toast.info('Sign in to save titles to your workspace.')
      return navigate('/login', { state: { from: `/books/${id}` } })
    }
    try {
      const res = await api.toggleBookmark(book.id)
      setSaved(res.saved)
      await refresh()
      toast.success(res.saved ? 'Saved to your research dossier.' : 'Removed from your research dossier.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <LoadingBlock label="Retrieving the codex registry…" rows={5} />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <ErrorState message={state.error} onRetry={load} />
        <div className="text-center mt-space-md">
          <Link to="/catalog" className="font-label-md text-label-md text-brass-muted hover:text-secondary">
            ← Back to the catalogue
          </Link>
        </div>
      </div>
    )
  }

  const onLoanCopies = Math.max(0, book.totalCopies - book.availableCopies)

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">menu_book</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <Link className="hover:text-walnut-dark transition-colors" to="/catalog">
          Universal Catalogue
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <Link className="hover:text-walnut-dark transition-colors" to={`/catalog?category=${book.category?.slug || ''}`}>
          {book.category?.name || 'Uncategorised'}
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-medium truncate max-w-[40ch]">{book.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Digitisation plate */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="relative bg-surface-container-lowest rounded-xl shadow-md overflow-hidden p-space-md">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-brass-accent text-[20px]">filter_vintage</span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Archival Digitisation Plate
                </span>
              </div>
              <div className="flex items-center bg-parchment p-0.5 rounded-lg shadow-sm">
                {SCANS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setScan(s.id)}
                    title={s.label}
                    type="button"
                    className={`px-2 py-0.5 text-label-sm font-label-sm rounded transition-colors ${
                      scan === s.id ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-walnut-dark'
                    }`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group rounded-lg overflow-hidden bg-primary-container shadow-inner aspect-[3/4] flex items-center justify-center">
              <img
                alt={`Cover of ${book.title}`}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ filter: scanFilter }}
                src={book.coverImage}
                onError={(e) => {
                  e.currentTarget.src = '/assets/stitch/ab2120dc13.jpg'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-walnut-dark/80 via-transparent to-black/20 pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-on-primary gap-2">
                <span className="bg-walnut-dark/90 backdrop-blur-md px-3 py-1.5 rounded-full font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <span className="material-symbols-outlined text-[16px] text-brass-accent">zoom_in</span>
                  {book.digitalFidelity}
                </span>
                <a
                  href={book.coverImage}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open full resolution plate"
                  className="bg-brass-accent text-walnut-dark p-2 rounded-full shadow-lg hover:bg-brass-muted hover:text-on-primary transition-all duration-300 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                </a>
              </div>
              <div className="absolute top-4 right-4 bg-parchment/90 backdrop-blur-sm text-walnut-dark px-2.5 py-1 rounded shadow-sm font-label-sm text-label-sm uppercase tracking-wider">
                Codex No. {String(book.shelfmark || '').split(' ').pop()} / {book.publishedYear}
              </div>
            </div>

            <div className="mt-space-md">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Archival Plates & Signatures
                </span>
                <span className="font-label-sm text-label-sm text-brass-muted">
                  {book.pages ? `${book.pages} pp.` : 'Extent unknown'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-space-xs">
                <a
                  href={book.coverImage}
                  target="_blank"
                  rel="noreferrer"
                  className="relative rounded overflow-hidden aspect-[4/5] bg-surface-container shadow-sm"
                >
                  <img alt="Binding plate" className="w-full h-full object-cover" src={book.coverImage} />
                  <div className="absolute inset-0 bg-brass-accent/20" />
                  <span className="absolute bottom-1 left-1 font-label-sm text-[9px] bg-walnut-dark/90 text-on-primary px-1 rounded">
                    Binding
                  </span>
                </a>
                {[
                  ['menu_book', 'Incipit', 'fol. [A2r]'],
                  ['schema', 'Foldout plate', 'Plate I'],
                  ['ink_pen', 'Marginalia', book.language || 'autograph'],
                ].map(([icon, label, sub]) => (
                  <div
                    key={label}
                    className="relative rounded overflow-hidden aspect-[4/5] bg-parchment shadow-sm flex flex-col items-center justify-center p-1 text-center group"
                  >
                    <span className="material-symbols-outlined text-brass-muted text-[24px] group-hover:scale-110 transition-transform">
                      {icon}
                    </span>
                    <span className="font-label-sm text-[9px] uppercase text-walnut-dark mt-1 font-semibold">{label}</span>
                    <span className="font-body-sm text-[8px] text-on-surface-variant">{sub}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-sm flex flex-wrap items-center justify-between gap-space-xs text-on-surface-variant">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-brass-accent">download</span> Export Citation
              </span>
              <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
                <button
                  onClick={() => download(`${book.id}.bib`, bibtexFor(book), 'application/x-bibtex')}
                  className="bg-surface-container-lowest hover:bg-parchment text-walnut-dark px-2.5 py-1 rounded shadow-sm transition-colors"
                  type="button"
                >
                  BibTeX
                </button>
                <button
                  onClick={() => download(`${book.id}.ris`, risFor(book), 'application/x-research-info-systems')}
                  className="bg-surface-container-lowest hover:bg-parchment text-walnut-dark px-2.5 py-1 rounded shadow-sm transition-colors"
                  type="button"
                >
                  Zotero RIS
                </button>
                <button
                  onClick={() => download(`${book.id}.json`, JSON.stringify(book, null, 2), 'application/json')}
                  className="bg-surface-container-lowest hover:bg-parchment text-walnut-dark px-2.5 py-1 rounded shadow-sm transition-colors flex items-center gap-1"
                  type="button"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brass-accent" /> IIIF JSON-LD
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Record */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted bg-parchment px-2.5 py-1 rounded">
                {book.publisher || 'Athenaeum Digital Repository'}
              </span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">Anno {book.publishedYear}</span>
              <AvailabilityPill book={book} />
            </div>
            <h1 className="font-display text-display-mobile md:text-display text-walnut-dark tracking-tight leading-[1.08] mt-1">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="font-headline-md text-headline-md text-on-surface-variant italic font-normal">{book.subtitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-space-xs text-charcoal-text font-body-md text-body-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brass-accent text-[20px]">person_outline</span>
                <span>
                  <strong>{book.author}</strong>{' '}
                  {book.authorDates && <span className="text-on-surface-variant text-body-sm">({book.authorDates})</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brass-accent text-[20px]">local_library</span>
                <span>{book.category?.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-space-md py-space-sm mt-space-xs bg-parchment/60 rounded-xl px-space-md flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="flex text-brass-accent">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                </div>
                <span className="font-headline-sm text-headline-sm text-walnut-dark font-semibold">
                  {(book.rating ?? 0).toFixed(2)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ 5.0</span>
              </div>
              <div className="w-1 h-4 bg-border-strong rounded-full" />
              <div className="flex items-center gap-1.5 font-label-md text-label-md text-walnut-dark">
                <span className="material-symbols-outlined text-brass-muted text-[18px]">verified</span>
                <span>{(book.citationCount || 0).toLocaleString('en-GB')} Archival Citations</span>
              </div>
              <div className="w-1 h-4 bg-border-strong rounded-full" />
              <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                <span>
                  {book.availableCopies} of {book.totalCopies} copies on the shelf
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
            {[
              ['Shelfmark', (book.shelfmark || '').split('•')[0].trim(), book.location],
              ['Extent', book.pages ? `${book.pages} pp.` : '—', 'Collation recorded'],
              ['Codex Language', book.codexLanguage, book.collectionName],
              ['Classification', book.callNumber || '—', book.category?.name],
            ].map(([label, value, sub]) => (
              <div key={label} className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block mb-1">{label}</span>
                <span className="font-label-lg text-label-lg font-bold text-walnut-dark block truncate" title={value}>
                  {value}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] truncate block">{sub}</span>
              </div>
            ))}
          </div>

          {/* Circulation action panel */}
          <div className="bg-cream-surface rounded-xl p-space-md shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm mb-space-sm bg-parchment/60 p-space-sm rounded-lg">
              <div className="flex items-center gap-space-sm">
                <span
                  className={`w-3 h-3 rounded-full ${book.availableCopies > 0 ? 'bg-brass-accent' : 'bg-error'} animate-pulse`}
                />
                <div>
                  <span className="font-label-lg text-label-lg text-walnut-dark block">
                    {book.availableCopies > 0 ? 'Available for loan' : 'All copies currently on loan'}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {onLoanCopies} of {book.totalCopies} {onLoanCopies === 1 ? 'copy is' : 'copies are'} out on circulation
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted bg-surface-container-lowest px-2 py-1 rounded shadow-sm">
                  {book.accessTier}
                </span>
              </div>
            </div>

            {state.myActiveLoan ? (
              <div className="flex flex-col gap-space-sm">
                <div
                  className={`rounded-lg p-space-sm flex flex-wrap items-center justify-between gap-2 ring-1 ${
                    state.myActiveLoan.isOverdue ? 'bg-error-container/50 ring-error/30' : 'bg-surface-container-low ring-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-brass-muted">event_available</span>
                    <span className="font-label-md text-label-md text-walnut-dark">
                      You hold this copy — due {formatDate(state.myActiveLoan.dueDate)} ({relativeDays(state.myActiveLoan.dueDate)})
                    </span>
                  </div>
                  {state.myActiveLoan.isOverdue && (
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">
                      Overdue — return at the circulation desk
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-space-sm">
                  <button
                    onClick={handleReturn}
                    disabled={busy}
                    className="flex-1 bg-primary text-on-primary hover:bg-primary-container px-space-lg py-space-sm rounded-lg shadow-sm font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-brass-accent">assignment_return</span>
                    <span>{busy ? 'Recording return…' : 'Return Copy to Vault'}</span>
                  </button>
                  <button
                    onClick={handleRenew}
                    disabled={busy || state.myActiveLoan.isOverdue}
                    className="bg-parchment hover:bg-surface-container-high text-walnut-dark px-space-md py-space-sm rounded-lg shadow-sm font-label-lg text-label-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">update</span>
                    <span>Renew</span>
                  </button>
                  <button
                    onClick={handleBookmark}
                    aria-label="Save to research dossier"
                    className={`p-space-sm rounded-lg shadow-sm flex items-center justify-center transition-colors ${
                      saved ? 'bg-brass-accent text-walnut-dark' : 'bg-parchment hover:bg-surface-container-high text-walnut-dark'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[22px]">{saved ? 'bookmark_added' : 'bookmark_add'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                <button
                  onClick={handleBorrow}
                  disabled={busy || book.availableCopies === 0}
                  className="flex-1 bg-primary text-on-primary hover:bg-primary-container px-space-lg py-space-sm rounded-lg shadow-sm font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span className="material-symbols-outlined text-brass-accent group-hover:scale-110 transition-transform">
                    auto_stories
                  </span>
                  <span>
                    {busy
                      ? 'Reserving copy…'
                      : book.availableCopies > 0
                        ? 'Borrow This Copy'
                        : 'No Copies Available — Join Waitlist'}
                  </span>
                </button>
                <button
                  onClick={handleBookmark}
                  aria-label="Save to research dossier"
                  className={`p-space-sm rounded-lg shadow-sm flex items-center justify-center transition-colors ${
                    saved ? 'bg-brass-accent text-walnut-dark' : 'bg-parchment hover:bg-surface-container-high text-walnut-dark'
                  }`}
                  type="button"
                  title="Bookmark in research dossier"
                >
                  <span className="material-symbols-outlined text-[22px]">{saved ? 'bookmark_added' : 'bookmark_add'}</span>
                </button>
              </div>
            )}

            <div className="mt-space-sm flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-brass-muted text-[16px]">info</span>
              <span>
                Physical vault inspection requires faculty research credentials. Loans run for 21 days with up to two
                renewals.
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass-accent" />
            <div className="pl-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted mb-1 block">
                Curator's Summary
              </span>
              <p className="font-headline-sm text-headline-sm text-walnut-dark italic font-normal leading-relaxed">
                {book.excerpt || book.description.slice(0, 220)}
              </p>
              <div className="mt-2 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant gap-2 flex-wrap">
                <span>Athenaeum Conservation Registry</span>
                <span className="text-brass-muted uppercase">
                  {book.collectionName || 'General Collection'} • {book.accessTier}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-space-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-space-xs bg-surface-container p-1 rounded-xl shadow-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-space-md py-space-sm rounded-lg font-label-lg text-label-lg flex items-center gap-2 shrink-0 transition-colors ${
                tab === t.id
                  ? 'bg-surface-container-lowest text-walnut-dark shadow-sm'
                  : 'text-on-surface-variant hover:text-walnut-dark hover:bg-parchment/70'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${tab === t.id ? 'text-brass-accent' : ''}`}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg mt-space-md">
          {tab === 'synopsis' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <div className="lg:col-span-8">
                <h2 className="font-headline-md text-headline-md text-walnut-dark mb-space-sm">Synopsis</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">{book.description}</p>
              </div>
              <aside className="lg:col-span-4">
                <div className="bg-parchment/60 rounded-xl p-space-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted block mb-2">
                    Incipit & Colophon
                  </span>
                  <blockquote className="font-headline-sm text-headline-sm text-walnut-dark italic leading-relaxed">
                    {book.excerpt || `“${book.title}” — ${book.author}, ${book.publishedYear}.`}
                  </blockquote>
                </div>
                <div className="grid grid-cols-2 gap-space-xs font-body-sm text-body-sm mt-space-sm">
                  <div className="bg-surface-container-low rounded-lg p-2">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant block">Publisher</span>
                    <span className="font-headline-sm text-headline-sm text-walnut-dark font-semibold block leading-tight">
                      {book.publisher || '—'}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant block">Extent</span>
                    <span className="font-headline-sm text-headline-sm text-walnut-dark font-semibold block leading-tight">
                      {book.pages ? `${book.pages} pp.` : '—'}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {tab === 'codicology' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div>
                <h2 className="font-headline-md text-headline-md text-walnut-dark mb-space-sm">Physical Codicology</h2>
                <dl className="divide-y divide-border-subtle">
                  {[
                    ['Shelfmark', book.shelfmark],
                    ['Call number', book.callNumber || '—'],
                    ['Collection', book.collectionName || '—'],
                    ['Location', book.location || '—'],
                    ['Extent', book.pages ? `${book.pages} pages` : '—'],
                    ['Language', book.codexLanguage],
                    ['Access tier', book.accessTier],
                    ['Digitisation fidelity', book.digitalFidelity],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2 gap-4">
                      <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</dt>
                      <dd className="font-body-md text-body-md text-walnut-dark text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-walnut-dark mb-space-sm">Provenance & Conservation</h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Catalogued into the Athenaeum repository as part of the {book.collectionName || 'general'} accession.
                  Collation, watermark analysis and ink characterisation were recorded during digitisation at{' '}
                  {book.digitalFidelity}.
                </p>
                <div className="flex flex-wrap gap-2 mt-space-md">
                  {(book.tags || []).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-surface-container text-walnut-dark font-label-sm text-label-sm uppercase">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-space-md bg-parchment/60 rounded-lg p-space-sm">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block mb-1">
                    Conservation note
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Requests for original consultation are assessed by the curator on duty. Digital surrogates are
                    available immediately at full capture resolution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'circulation' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {[
                {
                  title: 'Total copies held',
                  value: book.totalCopies,
                  body: 'Copies accessioned into the Athenaeum repository.',
                  icon: 'inventory_2',
                },
                {
                  title: 'Available now',
                  value: book.availableCopies,
                  body: 'Copies on the shelf and immediately requestable.',
                  icon: 'check_circle',
                },
                {
                  title: 'On loan',
                  value: onLoanCopies,
                  body: 'Copies currently out with scholars across the consortia.',
                  icon: 'schedule',
                },
              ].map((c) => (
                <div key={c.title} className="bg-surface-container-low rounded-xl p-space-md">
                  <div className="flex items-center gap-2 mb-space-xs">
                    <span className="material-symbols-outlined text-brass-muted text-[20px]">{c.icon}</span>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{c.title}</span>
                  </div>
                  <span className="font-headline-lg text-headline-lg text-walnut-dark block">{c.value}</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{c.body}</p>
                </div>
              ))}
              <div className="md:col-span-3 bg-cream-surface rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-brass-accent">event</span>
                  <span className="font-body-md text-body-md text-charcoal-text">
                    {state.myActiveLoan
                      ? `Your loan is due ${formatDate(state.myActiveLoan.dueDate)}.`
                      : 'You do not currently hold a copy of this title.'}
                  </span>
                </div>
                <Link
                  to="/circulation"
                  className="font-label-md text-label-md text-brass-muted hover:text-secondary underline underline-offset-4"
                >
                  View my full circulation record →
                </Link>
              </div>
            </div>
          )}

          {tab === 'related' && (
            <div>
              <h2 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight mb-space-md">
                Concordances in {book.category?.name}
              </h2>
              {state.related.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No other titles are catalogued in this discipline yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {state.related.map((r) => (
                    <Link
                      key={r.id}
                      to={`/books/${r.id}`}
                      className="bg-surface-container-low rounded-xl p-space-sm hover:bg-parchment transition-colors group"
                    >
                      <div className="aspect-[4/5] rounded-lg overflow-hidden bg-parchment mb-space-sm">
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={r.coverImage}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = '/assets/stitch/ab2120dc13.jpg'
                          }}
                        />
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-walnut-dark font-bold leading-tight group-hover:text-brass-muted transition-colors line-clamp-2">
                        {r.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{r.author}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
