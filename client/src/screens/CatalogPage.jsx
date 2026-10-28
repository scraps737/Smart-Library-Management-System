import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { CatalogBookCard, BookThumb } from '../components/BookCard'
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks'
import { useAuth } from '../context/AuthContext'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance & Citation Weight' },
  { value: 'year-asc', label: 'Publication Date (Earliest First)' },
  { value: 'year-desc', label: 'Publication Date (Latest First)' },
  { value: 'shelfmark', label: 'Shelfmark / Call Number' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'popular', label: 'Most Cited' },
  { value: 'recent', label: 'Recently Catalogued' },
]

const ERA_PRESETS = [
  { label: 'Monastic (Pre-1450)', from: 1, to: 1449 },
  { label: 'Incunabula (1450–1500)', from: 1450, to: 1500 },
  { label: 'High Renaissance (1500–1600)', from: 1500, to: 1600 },
  { label: 'Enlightenment (1600–1750)', from: 1600, to: 1750 },
]

/** Small labelled group used by the refine sidebar. */
function FacetSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-space-sm"
        aria-expanded={open}
      >
        <h3 className="font-headline-sm text-headline-sm text-walnut-dark text-left">{title}</h3>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{open ? 'expand_less' : icon}</span>
      </button>
      {open && children}
    </section>
  )
}

function FacetCheckbox({ label, count, checked, onChange }) {
  return (
    <label className="flex items-center justify-between group cursor-pointer gap-2">
      <span className="flex items-center gap-2 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 accent-primary-container rounded cursor-pointer shrink-0"
        />
        <span className={`truncate ${checked ? 'text-charcoal-text font-medium' : 'text-charcoal-text'} group-hover:text-walnut-dark`}>
          {label}
        </span>
      </span>
      <span className="text-on-surface-variant/70 font-label-sm text-label-sm shrink-0">{count}</span>
    </label>
  )
}

export default function CatalogPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const resultsRef = useRef(null)

  const params = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      category: searchParams.getAll('category'),
      author: searchParams.getAll('author'),
      accessTier: searchParams.getAll('accessTier'),
      codexLanguage: searchParams.getAll('codexLanguage'),
      collection: searchParams.getAll('collection'),
      yearFrom: searchParams.get('yearFrom') || '',
      yearTo: searchParams.get('yearTo') || '',
      availability: searchParams.get('availability') || '',
      sort: searchParams.get('sort') || 'relevance',
      page: Number(searchParams.get('page') || 1),
      view: searchParams.get('view') || 'grid',
    }),
    [searchParams]
  )

  const [searchDraft, setSearchDraft] = useState(params.search)
  const [authorFilter, setAuthorFilter] = useState('')
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => setSearchDraft(params.search), [params.search])

  const apply = useCallback(
    (changes, { resetPage = true, scroll = false } = {}) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(changes).forEach(([key, value]) => {
        next.delete(key)
        if (Array.isArray(value)) value.forEach((v) => v && next.append(key, v))
        else if (value !== undefined && value !== null && value !== '' && !(key === 'sort' && value === 'relevance')) {
          next.set(key, String(value))
        }
      })
      if (resetPage) next.delete('page')
      setSearchParams(next)
      if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const toggleMulti = useCallback(
    (key, value) => {
      const current = params[key]
      const nextValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      apply({ [key]: nextValues })
    },
    [params, apply]
  )

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    api
      .books({
        search: params.search,
        category: params.category,
        author: params.author,
        accessTier: params.accessTier,
        codexLanguage: params.codexLanguage,
        collection: params.collection,
        yearFrom: params.yearFrom,
        yearTo: params.yearTo,
        availability: params.availability,
        sort: params.sort,
        page: params.page,
        limit: 12,
      })
      .then((res) => {
        if (controller.signal.aborted) return
        setData(res)
        setStatus('ready')
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err.message)
        setStatus('error')
      })
    return () => controller.abort()
  }, [params, isAuthenticated])

  const facets = data?.facets
  const activeFilters = [
    ...params.category.map((slug) => ({
      key: 'category',
      value: slug,
      label: `Discipline: ${facets?.categories?.find((c) => c.slug === slug)?.name || slug}`,
    })),
    ...params.author.map((a) => ({ key: 'author', value: a, label: `Scribe: ${a}` })),
    ...params.accessTier.map((t) => ({ key: 'accessTier', value: t, label: `Access: ${t}` })),
    ...params.codexLanguage.map((l) => ({ key: 'codexLanguage', value: l, label: `Language: ${l}` })),
    ...params.collection.map((c) => ({ key: 'collection', value: c, label: `Collection: ${c}` })),
    ...(params.yearFrom || params.yearTo
      ? [{ key: 'year', value: null, label: `Era: ${params.yearFrom || 'earliest'}–${params.yearTo || 'latest'} A.D.` }]
      : []),
    ...(params.availability ? [{ key: 'availability', value: null, label: `Availability: ${params.availability}` }] : []),
  ]

  const removeFilter = (f) => {
    if (f.key === 'year') apply({ yearFrom: '', yearTo: '' })
    else if (f.value === null) apply({ [f.key]: '' })
    else apply({ [f.key]: params[f.key].filter((v) => v !== f.value) })
  }

  const resetAll = () =>
    apply({ search: '', category: [], author: [], accessTier: [], codexLanguage: [], collection: [], yearFrom: '', yearTo: '', availability: '', sort: '' }, { scroll: false })

  const visibleAuthors = (facets?.authors || []).filter((a) => a.value.toLowerCase().includes(authorFilter.toLowerCase()))

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    apply({ search: searchDraft.trim() }, { scroll: true })
  }

  return (
    <div className="flex flex-col w-full">
      {/* Search masthead */}
      <div className="w-full bg-cream-surface/70 pb-space-lg">
        <div className="max-w-[1440px] mx-auto px-margin">
          <nav className="flex items-center gap-space-xs pt-space-md pb-space-sm font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
            <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              Athenaeum
            </Link>
            <span className="text-on-surface-variant/40">/</span>
            <span className="text-walnut-dark font-medium">Universal Catalogue</span>
            <span className="text-on-surface-variant/40">/</span>
            <span className="text-brass-muted">Concordance Index</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs pb-space-md">
            <div className="max-w-3xl">
              <div className="flex items-center gap-space-sm mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
                  Bibliotheca Universalis
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-border-strong" />
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Series I • Vol. XIV
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">
                Universal Catalog & Manuscript Discovery
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
                Search the catalogued folios, illuminated manuscripts, critical treatises, and peer-reviewed humanist
                monographs held in the Athenaeum repository.
              </p>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-lg shadow-sm">
              <div className="w-2 h-2 rounded-full bg-brass-accent animate-pulse" />
              <span className="font-label-md text-label-md text-walnut-dark">
                Displaying{' '}
                <strong className="font-semibold text-primary">
                  {status === 'ready' ? `${data.total} matched ${data.total === 1 ? 'folio' : 'folios'}` : '…'}
                </strong>{' '}
                across {facets?.categories?.length || 0} disciplines
              </span>
            </div>
          </div>

          {/* Search architecture */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-md relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brass-accent/5 pointer-events-none blur-2xl" />
            <form className="flex flex-col gap-space-sm relative z-10" onSubmit={handleSearchSubmit}>
              <div className="flex flex-col lg:flex-row items-stretch gap-space-xs">
                <div className="relative shrink-0 lg:min-w-[240px]">
                  <select
                    value={params.availability}
                    onChange={(e) => apply({ availability: e.target.value })}
                    aria-label="Availability"
                    className="w-full h-12 bg-surface-container-low text-walnut-dark font-label-md text-label-md px-3.5 pr-8 rounded-lg appearance-none cursor-pointer focus:bg-surface-container-lowest focus:ring-1 focus:ring-brass-accent transition-all outline-none"
                  >
                    <option value="">All Holdings</option>
                    <option value="available">Available Now</option>
                    <option value="onloan">Partially On Loan</option>
                    <option value="unavailable">All Copies On Loan</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">
                    expand_more
                  </span>
                </div>

                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                    search
                  </span>
                  <input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    className="w-full h-12 pl-11 pr-24 rounded-lg bg-surface-container-lowest text-charcoal-text font-body-md text-body-md shadow-inner placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-brass-accent"
                    placeholder="Search by title, author, shelfmark, publisher, keyword (e.g. 'Newton Principia', 'CART. 1570-ORT')…"
                    type="search"
                    aria-label="Search the catalogue"
                  />
                  {searchDraft && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-on-surface-variant/70 hover:text-walnut-dark font-label-sm text-label-sm uppercase tracking-wider transition-colors"
                      type="button"
                      onClick={() => {
                        setSearchDraft('')
                        apply({ search: '' })
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-space-xs shrink-0">
                  <button
                    type="submit"
                    className="h-12 px-space-lg rounded-lg bg-primary-container hover:bg-walnut-dark text-on-primary font-label-lg text-label-lg flex items-center gap-2 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px] text-secondary-container">manage_search</span>
                    <span>Search Archival Index</span>
                  </button>
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-space-xs pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                  <span className="uppercase tracking-widest text-on-surface-variant/70 mr-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">filter_alt</span> Active Criteria:
                  </span>
                  {activeFilters.map((f, i) => (
                    <span
                      key={`${f.key}-${f.value}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-parchment text-walnut-dark"
                    >
                      <span>{f.label}</span>
                      <button className="hover:text-error transition-colors" type="button" onClick={() => removeFilter(f)}>
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                  <button
                    className="text-brass-muted hover:text-secondary font-label-sm text-label-sm underline underline-offset-4 ml-auto"
                    type="button"
                    onClick={resetAll}
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Results + refine sidebar */}
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <aside className="lg:col-span-3 space-y-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brass-muted text-[20px]">filter_list</span>
                <h2 className="font-label-lg text-label-lg text-walnut-dark tracking-wide uppercase">Refine Folio Index</h2>
              </div>
              <span className="bg-surface-container px-2 py-0.5 rounded font-label-sm text-label-sm text-brass-muted">
                {activeFilters.length} Active
              </span>
            </div>

            <FacetSection title="Discipline & Tract" icon="expand_more">
              <div className="space-y-2 font-body-sm text-body-sm">
                {(facets?.categories || []).map((c) => (
                  <FacetCheckbox
                    key={c.slug}
                    label={c.name}
                    count={c.count}
                    checked={params.category.includes(c.slug)}
                    onChange={() => toggleMulti('category', c.slug)}
                  />
                ))}
                {!facets && <p className="text-on-surface-variant/70">Loading disciplines…</p>}
              </div>
            </FacetSection>

            <FacetSection title="Scribing / Imprint Era" icon="history_edu">
              <div className="grid grid-cols-2 gap-1.5 mb-space-sm">
                {ERA_PRESETS.map((p) => {
                  const active = String(params.yearFrom) === String(p.from) && String(params.yearTo) === String(p.to)
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => apply(active ? { yearFrom: '', yearTo: '' } : { yearFrom: p.from, yearTo: p.to })}
                      className={`px-2 py-1 rounded text-left font-label-sm text-label-sm transition-colors ${
                        active
                          ? 'bg-primary-container text-on-primary font-semibold'
                          : 'bg-parchment hover:bg-surface-container text-walnut-dark'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-space-xs pt-1">
                <div className="flex-1 bg-surface-container-low px-2 py-1.5 rounded">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">From A.D.</span>
                  <input
                    className="w-full bg-transparent font-title text-title text-walnut-dark focus:outline-none"
                    type="number"
                    value={params.yearFrom}
                    min={facets?.yearRange?.min || 1}
                    max={facets?.yearRange?.max || 2100}
                    onChange={(e) => apply({ yearFrom: e.target.value })}
                    aria-label="Earliest publication year"
                  />
                </div>
                <span className="text-on-surface-variant/40">—</span>
                <div className="flex-1 bg-surface-container-low px-2 py-1.5 rounded">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">To A.D.</span>
                  <input
                    className="w-full bg-transparent font-title text-title text-walnut-dark focus:outline-none"
                    type="number"
                    value={params.yearTo}
                    min={facets?.yearRange?.min || 1}
                    max={facets?.yearRange?.max || 2100}
                    onChange={(e) => apply({ yearTo: e.target.value })}
                    aria-label="Latest publication year"
                  />
                </div>
              </div>
              {facets?.yearRange?.min && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                  Catalogue spans A.D. {facets.yearRange.min}–{facets.yearRange.max}
                </p>
              )}
            </FacetSection>

            <FacetSection title="Author & Master Scribe" icon="expand_more">
              <div className="relative mb-space-sm">
                <input
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 bg-surface-container-low text-charcoal-text font-body-sm text-body-sm rounded focus:outline-none focus:ring-1 focus:ring-brass-accent"
                  placeholder="Filter scholars..."
                  type="text"
                  aria-label="Filter authors"
                />
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                  person_search
                </span>
              </div>
              <div className="space-y-2 font-body-sm text-body-sm max-h-48 overflow-y-auto pr-1">
                {visibleAuthors.map((a) => (
                  <FacetCheckbox
                    key={a.value}
                    label={a.value}
                    count={a.count}
                    checked={params.author.includes(a.value)}
                    onChange={() => toggleMulti('author', a.value)}
                  />
                ))}
                {facets && visibleAuthors.length === 0 && (
                  <p className="text-on-surface-variant/70">No scribes match that filter.</p>
                )}
              </div>
            </FacetSection>

            <FacetSection title="Archival Access Tier" icon="lock_open_right">
              <div className="space-y-2 font-body-sm text-body-sm">
                {(facets?.accessTiers || []).map((t) => (
                  <FacetCheckbox
                    key={t.value}
                    label={t.value}
                    count={t.count}
                    checked={params.accessTier.includes(t.value)}
                    onChange={() => toggleMulti('accessTier', t.value)}
                  />
                ))}
              </div>
            </FacetSection>

            <FacetSection title="Codex Language" icon="translate">
              <div className="space-y-2 font-body-sm text-body-sm">
                {(facets?.languages || []).map((l) => (
                  <FacetCheckbox
                    key={l.value}
                    label={l.value}
                    count={l.count}
                    checked={params.codexLanguage.includes(l.value)}
                    onChange={() => toggleMulti('codexLanguage', l.value)}
                  />
                ))}
              </div>
            </FacetSection>

            <FacetSection title="Curated Collection" icon="collections_bookmark" defaultOpen={false}>
              <div className="space-y-2 font-body-sm text-body-sm">
                {(facets?.collections || []).map((c) => (
                  <FacetCheckbox
                    key={c.value}
                    label={c.value}
                    count={c.count}
                    checked={params.collection.includes(c.value)}
                    onChange={() => toggleMulti('collection', c.value)}
                  />
                ))}
              </div>
            </FacetSection>

            <div className="pt-space-xs space-y-space-xs">
              <button
                type="button"
                onClick={() => apply({}, { resetPage: false })}
                className="w-full py-2.5 px-space-md rounded-lg bg-cream-surface hover:bg-parchment text-walnut-dark font-label-md text-label-md flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Re-apply Current Query
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="w-full py-2 px-space-md rounded text-on-surface-variant/70 hover:text-walnut-dark font-label-sm text-label-sm uppercase tracking-wider text-center"
              >
                Revert to Default Indexes
              </button>
            </div>
          </aside>

          <section className="lg:col-span-9 flex flex-col gap-space-md" ref={resultsRef}>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="font-headline-sm text-headline-sm text-walnut-dark">
                  {status === 'ready' ? `${data.total} ${data.total === 1 ? 'Manuscript' : 'Manuscripts'}` : 'Consulting…'}
                </span>
                <span className="text-on-surface-variant/40">•</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {status === 'ready' && data.total > 0
                    ? `Showing ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} of ${data.total}`
                    : 'No folios listed'}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-space-sm">
                <div className="flex items-center gap-2">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant" htmlFor="order">
                    Order:
                  </label>
                  <select
                    id="order"
                    value={params.sort}
                    onChange={(e) => apply({ sort: e.target.value })}
                    className="bg-surface-container-low px-3 py-1.5 rounded font-label-md text-label-md text-walnut-dark focus:outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => apply({ view: 'grid' }, { resetPage: false })}
                    className={`p-1.5 rounded transition-colors ${
                      params.view === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-walnut-dark'
                    }`}
                    title="Card Grid View"
                  >
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => apply({ view: 'list' }, { resetPage: false })}
                    className={`p-1.5 rounded transition-colors ${
                      params.view === 'list' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-walnut-dark'
                    }`}
                    title="Detailed Scholarly List View"
                  >
                    <span className="material-symbols-outlined text-[18px]">view_headline</span>
                  </button>
                </div>
              </div>
            </div>

            {status === 'loading' && <SkeletonCards count={6} />}
            {status === 'error' && <ErrorState message={error} onRetry={() => apply({}, { resetPage: false })} />}
            {status === 'ready' && data.items.length === 0 && (
              <EmptyState
                title="No folios match this query"
                body="Try broadening the discipline, clearing the era range, or searching a different shelfmark or scribe."
                action={
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
                  >
                    Reset all filters
                  </button>
                }
              />
            )}

            {status === 'ready' && data.items.length > 0 && params.view === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {data.items.map((book) => (
                  <CatalogBookCard key={book.id} book={book} />
                ))}
              </div>
            )}

            {status === 'ready' && data.items.length > 0 && params.view === 'list' && (
              <div className="bg-surface-container-lowest rounded-xl shadow-sm divide-y divide-border-subtle overflow-hidden">
                {data.items.map((book) => (
                  <div key={book.id} className="p-space-md flex flex-col sm:flex-row sm:items-center gap-space-md hover:bg-parchment/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <BookThumb book={book} to={`/books/${book.id}`} subtitle={`${book.author} • ${book.publishedYear}`} />
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 font-mono truncate">{book.shelfmark}</p>
                    </div>
                    <div className="flex items-center gap-space-sm shrink-0">
                      <span className="hidden md:inline px-2 py-0.5 rounded bg-surface-container text-walnut-dark font-label-sm text-label-sm uppercase">
                        {book.category?.name || 'Uncategorised'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm text-label-sm uppercase ${
                          book.availableCopies > 0 ? 'bg-secondary-container/70 text-on-secondary-fixed' : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                      <Link
                        to={`/books/${book.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === 'ready' && data.pages > 1 && (
              <nav className="flex items-center justify-center gap-space-xs flex-wrap" aria-label="Pagination">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => apply({ page: data.page - 1 }, { resetPage: false, scroll: true })}
                  className="px-space-md py-2 rounded-lg bg-surface-container-lowest shadow-sm font-label-md text-label-md text-walnut-dark hover:bg-parchment transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: data.pages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => apply({ page: i + 1 }, { resetPage: false, scroll: true })}
                    className={`w-10 h-10 rounded-lg font-label-md text-label-md transition-colors ${
                      data.page === i + 1
                        ? 'bg-primary-container text-on-primary shadow-sm'
                        : 'bg-surface-container-lowest shadow-sm text-walnut-dark hover:bg-parchment'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={data.page >= data.pages}
                  onClick={() => apply({ page: data.page + 1 }, { resetPage: false, scroll: true })}
                  className="px-space-md py-2 rounded-lg bg-surface-container-lowest shadow-sm font-label-md text-label-md text-walnut-dark hover:bg-parchment transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
