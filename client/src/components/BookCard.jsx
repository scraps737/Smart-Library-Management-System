import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const FALLBACK_COVER = '/assets/stitch/ab2120dc13.jpg'
const UNSPLASH_STYLE = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'

function useCover() {
  return (book) => book?.coverImage || FALLBACK_COVER
}

function onCoverError(e) {
  if (!e.currentTarget.dataset.fallback) {
    e.currentTarget.dataset.fallback = '1'
    e.currentTarget.src = FALLBACK_COVER
  }
}

export function Citations({ count }) {
  return (
    <span className="text-brass-muted font-semibold flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">star</span> {(count || 0).toLocaleString('en-GB')} cites
    </span>
  )
}

export function AvailabilityPill({ book }) {
  const available = book.availableCopies > 0
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider ${
        available ? 'bg-secondary-container/70 text-on-secondary-fixed' : 'bg-error-container text-on-error-container'
      }`}
    >
      <span className="material-symbols-outlined text-[13px]">{available ? 'check_circle' : 'block'}</span>
      {available ? `${book.availableCopies} of ${book.totalCopies} available` : 'All copies on loan'}
    </span>
  )
}

/** Card used in the Universal Catalogue results grid. */
export function CatalogBookCard({ book }) {
  const cover = useCover()
  const { isAuthenticated, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleBookmark() {
    if (!isAuthenticated) {
      toast.info('Sign in to save titles to your workspace.')
      navigate('/login')
      return
    }
    try {
      const res = await api.toggleBookmark(book.id)
      await refresh()
      toast.success(res.saved ? `Saved “${book.title}” to your workspace.` : `Removed “${book.title}” from your workspace.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const subjectTags = (book.tags || []).filter((t) => t.toLowerCase() !== (book.codexLanguage || '').toLowerCase())

  return (
    <article className="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
      <div className="relative h-56 bg-parchment overflow-hidden">
        <Link to={`/books/${book.id}`} aria-label={`Open ${book.title}`}>
          <img className={UNSPLASH_STYLE} src={cover(book)} alt={`Cover of ${book.title}`} onError={onCoverError} />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          <span className="px-2 py-0.5 rounded bg-primary-container/90 backdrop-blur-sm text-on-primary font-label-sm text-label-sm uppercase tracking-wider">
            {book.accessTier}
          </span>
          <span className="px-2 py-0.5 rounded bg-secondary-container/90 text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider">
            {book.digitalFidelity}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 text-on-primary right-14">
          <span className="font-label-sm text-label-sm tracking-widest text-parchment/80 uppercase block">Shelfmark Registry</span>
          <span className="font-label-md text-label-md font-mono tracking-tight text-white block truncate">{book.shelfmark}</span>
        </div>

        <button
          onClick={handleBookmark}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center text-walnut-dark hover:bg-surface-container-lowest transition-colors shadow"
          type="button"
          title="Save to workspace"
        >
          <span className="material-symbols-outlined text-[18px]">bookmark</span>
        </button>
      </div>

      <div className="p-space-md flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-on-surface-variant font-label-sm text-label-sm mb-1">
            <span className="truncate">
              {book.publisher ? `${book.publisher} • ` : ''}
              {book.publishedYear}
            </span>
            <Citations count={book.citationCount} />
          </div>
          <h3 className="font-headline-md text-headline-md text-walnut-dark leading-snug group-hover:text-brass-muted transition-colors">
            <Link to={`/books/${book.id}`}>{book.title}</Link>
          </h3>
          <p className="font-label-lg text-label-lg text-on-surface-variant font-medium mt-1">
            {book.author}
            {book.authorDates ? ` (${book.authorDates})` : ''}
          </p>

          {book.excerpt && (
            <blockquote className="mt-space-sm pl-space-sm bg-parchment/60 py-2 rounded-r font-headline-sm italic text-body-sm text-charcoal-text line-clamp-3">
              {book.excerpt}
            </blockquote>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-space-sm">
            <span className="px-2 py-0.5 rounded bg-surface-container text-walnut-dark font-label-sm text-label-sm uppercase">
              {book.codexLanguage}
            </span>
            {subjectTags.slice(0, 2).map((t) => (
              <span key={t} className="px-2 py-0.5 rounded bg-surface-container text-walnut-dark font-label-sm text-label-sm uppercase">
                {t}
              </span>
            ))}
            {book.collectionName && (
              <span className="px-2 py-0.5 rounded bg-surface-container text-brass-muted font-label-sm text-label-sm uppercase">
                {book.collectionName}
              </span>
            )}
          </div>

          <div className="mt-space-sm">
            <AvailabilityPill book={book} />
          </div>
        </div>

        <div className="pt-space-md mt-space-sm flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-2">
            <Link
              className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors flex items-center gap-1.5 shadow-sm"
              to={`/books/${book.id}`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              Read Codex Folio
            </Link>
            <Link
              to={`/books/${book.id}`}
              className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-walnut-dark transition-colors"
              title="Availability & circulation"
            >
              <span className="material-symbols-outlined text-[18px]">zoom_in</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

/** Rarer "folio" card used for the Curator's Selection on the home page. */
export function FolioBookCard({ book }) {
  const cover = useCover()
  const shelfChip = (book.shelfmark || '').split('•')[0].trim()

  return (
    <article className="bg-surface-container-lowest rounded-xl shadow-md p-space-md flex flex-col justify-between hover:shadow-xl transition-all duration-300 group">
      <div>
        <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden mb-space-md shadow-sm bg-primary-container">
          <Link to={`/books/${book.id}`} aria-label={`Open ${book.title}`}>
            <img className={UNSPLASH_STYLE} src={cover(book)} alt={`Cover of ${book.title}`} onError={onCoverError} />
          </Link>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent pointer-events-none" />
          <span className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-sm text-walnut-dark font-label-sm text-label-sm px-2 py-0.5 rounded shadow-sm font-semibold">
            {shelfChip}
          </span>
          <span className="absolute bottom-3 right-3 text-secondary-fixed font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">format_quote</span>{' '}
            {(book.citationCount || 0).toLocaleString('en-GB')} Citations
          </span>
        </div>
        <div className="flex items-center gap-space-xs text-brass-muted font-label-sm text-label-sm mb-1 uppercase tracking-wider font-semibold">
          <span className="truncate">{book.publisher ? book.publisher.split(',')[0] : book.collectionName}</span>
          <span>•</span>
          <span>{book.publishedYear}</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-walnut-dark mb-1 leading-snug group-hover:text-secondary transition-colors">
          <Link to={`/books/${book.id}`}>{book.title}</Link>
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-sm italic">{book.author}</p>
        <div className="flex flex-wrap gap-1 mb-space-md">
          {(book.tags || []).slice(0, 2).map((t) => (
            <span key={t} className="bg-surface-container-low text-charcoal-text font-label-sm text-label-sm px-2 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="pt-space-sm flex items-center justify-between gap-space-xs bg-surface-container-low p-2 rounded-lg">
        <Link
          to={`/books/${book.id}`}
          className="flex-1 py-1.5 px-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded hover:bg-walnut-dark transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Read Folio</span>
        </Link>
        <Link
          to={`/books/${book.id}`}
          aria-label={`Borrow ${book.title}`}
          className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-surface-container text-walnut-dark flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">library_add</span>
        </Link>
      </div>
    </article>
  )
}

/** Compact cover + title row used inside tables and side panels. */
export function BookThumb({ book, to, subtitle }) {
  const cover = useCover()
  const content = (
    <div className="flex items-center gap-space-sm min-w-0">
      <div className="w-10 h-[3.25rem] rounded bg-parchment overflow-hidden shadow-sm shrink-0">
        <img className="w-full h-full object-cover" src={cover(book)} alt="" onError={onCoverError} />
      </div>
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-walnut-dark truncate">{book.title}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
          {subtitle || `${book.author} • ${book.publishedYear || ''}`}
        </p>
      </div>
    </div>
  )
  return to ? (
    // min-w-0 lets the link shrink inside a flex row so long titles truncate
    // instead of pushing sibling controls past the viewport edge.
    <Link to={to} className="hover:text-brass-muted min-w-0">
      {content}
    </Link>
  ) : (
    content
  )
}
