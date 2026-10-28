import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { FolioBookCard } from '../components/BookCard'
import { ErrorState, SkeletonCards } from '../components/StateBlocks'
import { relativeDays } from '../lib/format'

const QUICK_PICKS = ['Newton', 'Galileo', 'Kepler', 'Vesalius', 'Cartography', 'Copernicus']

function StatCard({ icon, eyebrow, value, title, body }) {
  return (
    <div className="bg-walnut-dark/50 p-space-lg rounded-xl shadow-sm">
      <div className="flex items-center justify-center lg:justify-start gap-space-xs mb-space-xs text-secondary-fixed">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest">{eyebrow}</span>
      </div>
      <div className="font-display text-display text-secondary-fixed-dim leading-none mb-1 font-bold">{value}</div>
      <p className="font-headline-sm text-headline-sm text-cream-surface">{title}</p>
      <p className="font-body-sm text-body-sm text-on-primary-container mt-1">{body}</p>
    </div>
  )
}

function AcquisitionRow({ book }) {
  return (
    <article className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-stretch gap-space-lg">
      <Link
        to={`/books/${book.id}`}
        className="w-full lg:w-56 h-48 lg:h-auto rounded-lg overflow-hidden shrink-0 relative bg-primary-container"
      >
        <img
          className="w-full h-full object-cover"
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          onError={(e) => {
            e.currentTarget.src = '/assets/stitch/ab2120dc13.jpg'
          }}
        />
        <span className="absolute top-2 left-2 bg-walnut-dark/80 text-cream-surface font-label-sm text-label-sm px-2 py-0.5 rounded">
          {book.collectionName || book.accessTier}
        </span>
      </Link>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-space-xs mb-1">
            <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
              {book.shelfmark}
            </span>
            <span className="text-outline font-body-sm text-body-sm">
              Catalogued {relativeDays(book.createdAt)}
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md text-walnut-dark mb-1">
            <Link to={`/books/${book.id}`} className="hover:text-brass-muted transition-colors">
              {book.title}
            </Link>
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-space-sm">{book.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="bg-parchment text-secondary font-label-sm text-label-sm px-2.5 py-1 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock_open</span> {book.accessTier}
            </span>
            <span className="bg-parchment text-secondary font-label-sm text-label-sm px-2.5 py-1 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">translate</span> {book.codexLanguage}
            </span>
            <span className="bg-parchment text-secondary font-label-sm text-label-sm px-2.5 py-1 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">inventory_2</span> {book.availableCopies}/
              {book.totalCopies} on shelf
            </span>
          </div>
          <Link
            to={`/books/${book.id}`}
            className="px-space-md py-1.5 bg-primary-container text-on-primary font-label-md text-label-md rounded hover:bg-walnut-dark transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Inspect Folio</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [state, setState] = useState({ status: 'loading', featured: [], recent: [], categories: [], stats: null, error: '' })

  function load() {
    setState((s) => ({ ...s, status: 'loading' }))
    Promise.all([
      api.books({ featured: 'true', limit: 4, sort: 'relevance' }),
      api.books({ sort: 'recent', limit: 3 }),
      api.categories(),
    ])
      .then(([featured, recent, categories]) => {
        const totals = categories.items.reduce(
          (acc, c) => ({
            titles: acc.titles + c.titleCount,
            copies: acc.copies + c.copyCount,
            available: acc.available + c.availableCount,
          }),
          { titles: 0, copies: 0, available: 0 }
        )
        setState({
          status: 'ready',
          featured: featured.items,
          recent: recent.items,
          categories: categories.items,
          stats: { ...totals, disciplines: categories.items.length },
          error: '',
        })
      })
      .catch((err) => setState((s) => ({ ...s, status: 'error', error: err.message })))
  }

  useEffect(load, [])

  const submitSearch = (e, override) => {
    e?.preventDefault()
    const term = (override ?? query).trim()
    const params = new URLSearchParams()
    if (term) params.set('search', term)
    if (scope !== 'all' && !override) params.set('category', scope)
    navigate(`/catalog${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div className="flex flex-col w-full">
      {/* Masthead */}
      <section className="relative w-full bg-cream-surface py-space-xl overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-40 pointer-events-none archival-dots" />
        <div className="max-w-[1440px] mx-auto px-margin relative z-10">
          <div className="flex items-center justify-center gap-space-sm mb-space-md">
            <span className="w-8 h-[1px] bg-brass-accent" />
            <span className="material-symbols-outlined text-[16px] text-brass-accent">auto_stories</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">
              Scholarly Repository • Archival Intelligence
            </span>
            <span className="w-8 h-[1px] bg-brass-accent" />
          </div>

          <div className="text-center max-w-4xl mx-auto mb-space-md">
            <h1 className="font-display text-display-mobile md:text-display text-walnut-dark tracking-tight leading-tight">
              Your Smarter <span className="italic font-display text-secondary">Digital Library</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm max-w-2xl mx-auto leading-relaxed">
              Discover catalogued manuscripts, peer-reviewed monographs, and primary sources — searchable, borrowable
              and categorised by discipline across the Athenaeum repository.
            </p>
          </div>

          <form className="max-w-4xl mx-auto mt-space-lg" onSubmit={submitSearch}>
            <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-md flex flex-col md:flex-row items-center gap-space-xs">
              <div className="relative w-full md:w-56">
                <label className="sr-only" htmlFor="search-scope">
                  Catalogue filter
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-surface-container-low text-walnut-dark font-label-md text-label-md py-3 px-space-md rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-surface-container-high transition-colors"
                  id="search-scope"
                >
                  <option value="all">All Catalogued Disciplines</option>
                  {state.categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  unfold_more
                </span>
              </div>

              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined text-[20px] text-brass-muted absolute left-3.5 top-1/2 -translate-y-1/2">
                  manage_search
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest font-body-md text-body-md text-charcoal-text placeholder:text-outline focus:outline-none rounded-lg"
                  id="library-search-input"
                  placeholder="Search titles, authors, shelfmarks, publishers, or keywords…"
                  type="text"
                />
              </div>

              <button
                className="w-full md:w-auto px-space-lg py-3 bg-primary-container text-on-primary font-label-lg text-label-lg rounded-lg shadow-sm hover:bg-walnut-dark transition-all flex items-center justify-center gap-space-xs group"
                id="search-btn"
                type="submit"
              >
                <span>Search Archive</span>
                <span className="material-symbols-outlined text-[18px] text-secondary-fixed group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-space-xs mt-space-md">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted mr-1">
                Concordance Picks:
              </span>
              {QUICK_PICKS.map((chip, i) => (
                <button
                  key={chip}
                  className="bg-parchment hover:bg-surface-container-highest text-charcoal-text font-label-sm text-label-sm px-space-sm py-1 rounded-full transition-colors flex items-center gap-1"
                  type="button"
                  onClick={(e) => submitSearch(e, chip)}
                >
                  <span className="material-symbols-outlined text-[12px] text-secondary">
                    {['explore', 'lightbulb', 'science', 'menu_book', 'psychology', 'public'][i % 6]}
                  </span>
                  {chip}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Federated repositories */}
      <section className="w-full bg-parchment py-space-sm shadow-sm">
        <div className="max-w-[1440px] mx-auto px-margin flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
            <span>Federated Scholarly Repositories:</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-space-lg font-headline-sm text-headline-sm text-walnut-dark tracking-normal">
            {[
              ['account_balance', 'Bodleian Digital'],
              ['history_edu', 'Vatican Apostolic Archive'],
              ['school', 'Sorbonne Collections'],
              ['menu_book', 'Cambridge Manuscript Registry'],
            ].map(([icon, label]) => (
              <Link key={label} to={`/catalog?search=${encodeURIComponent(label.split(' ')[0])}`} className="flex items-center gap-2 hover:text-secondary transition-colors">
                <span className="material-symbols-outlined text-[18px] text-brass-accent">{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {state.status === 'error' && (
        <div className="max-w-[1440px] mx-auto px-margin py-space-xl w-full">
          <ErrorState message={state.error} onRetry={load} />
        </div>
      )}

      {/* Curator's Selection */}
      <section className="max-w-[1440px] mx-auto px-margin py-space-xl w-full">
        <div className="flex flex-col md:flex-row items-baseline justify-between mb-space-lg gap-space-sm">
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted font-bold">
                Incunabula & Masterpieces
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-walnut-dark">Curator's Selection</h2>
          </div>
          <Link
            to="/catalog?sort=popular"
            className="font-label-lg text-label-lg text-secondary hover:text-secondary-fixed-dim transition-colors flex items-center gap-1 group font-semibold"
          >
            <span>Explore the full catalogue</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {state.status === 'loading' ? (
          <SkeletonCards count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {state.featured.map((book) => (
              <FolioBookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      {/* Explore by discipline */}
      <section className="w-full bg-parchment/60 py-space-xl shadow-inner">
        <div className="max-w-[1440px] mx-auto px-margin">
          <div className="mb-space-lg">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted font-bold">
              Taxonomies & Collections
            </span>
            <h2 className="font-headline-lg text-headline-lg text-walnut-dark mt-1">Explore by Discipline</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Structured using library-science concordance and semantic metadata drawn from the live catalogue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {state.categories.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                to={`/catalog?category=${c.slug}`}
                className="group bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all flex items-start gap-space-md"
              >
                <div className="w-12 h-12 rounded-lg bg-parchment group-hover:bg-secondary-container flex items-center justify-center text-secondary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[26px]">{c.icon}</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-walnut-dark group-hover:text-secondary transition-colors">
                    {c.name}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">{c.description}</p>
                  <div className="mt-space-sm flex items-center gap-2 flex-wrap">
                    <span className="font-label-sm text-label-sm text-brass-muted bg-surface-container px-2 py-0.5 rounded font-semibold">
                      {c.titleCount} {c.titleCount === 1 ? 'Title' : 'Titles'} • {c.availableCount} on shelf
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary flex items-center">Open Series →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-space-lg flex justify-center">
            <Link
              to="/categories"
              className="px-space-lg py-3 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-walnut-dark transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">apps</span>
              View all academic disciplines
            </Link>
          </div>
        </div>
      </section>

      {/* Recently digitised */}
      <section className="max-w-[1440px] mx-auto px-margin py-space-xl w-full">
        <div className="flex flex-col md:flex-row items-baseline justify-between mb-space-lg gap-space-sm">
          <div className="flex items-center gap-space-sm flex-wrap">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted font-bold">
                Laboratory Preservations
              </span>
              <h2 className="font-headline-lg text-headline-lg text-walnut-dark">Recently Catalogued Acquisitions</h2>
            </div>
            <span className="bg-secondary/10 text-secondary font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px]">lens_blur</span> Ingested into the live repository
            </span>
          </div>
          <Link
            to="/catalog?sort=recent"
            className="font-label-lg text-label-lg text-secondary hover:text-secondary-fixed-dim transition-colors flex items-center gap-1 group font-semibold"
          >
            <span>View the full register</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="space-y-space-md">
          {state.status === 'loading' && <SkeletonCards count={3} />}
          {state.status === 'ready' && state.recent.map((book) => <AcquisitionRow key={book.id} book={book} />)}
        </div>
      </section>

      {/* Repository register */}
      <section className="w-full bg-primary-container text-on-primary py-space-xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-margin relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter text-center lg:text-left">
            <StatCard
              icon="collections_bookmark"
              eyebrow="This Repository"
              value={state.stats ? state.stats.titles.toLocaleString('en-GB') : '—'}
              title="Catalogued Titles"
              body="Full records with collation, provenance and shelfmark assigned."
            />
            <StatCard
              icon="corporate_fare"
              eyebrow="Disciplines"
              value={state.stats ? state.stats.disciplines.toLocaleString('en-GB') : '—'}
              title="Academic Disciplines"
              body="Each discipline is a live taxonomy linked to the catalogue."
            />
            <StatCard
              icon="inventory_2"
              eyebrow="Physical Copies"
              value={state.stats ? state.stats.copies.toLocaleString('en-GB') : '—'}
              title="Copies Under Management"
              body="Tracked individually with availability and circulation ledgers."
            />
            <StatCard
              icon="check_circle"
              eyebrow="Available Now"
              value={state.stats ? state.stats.available.toLocaleString('en-GB') : '—'}
              title="Copies On The Shelf"
              body="Immediately requestable by any registered scholar."
            />
          </div>
        </div>
      </section>

      {/* Guided search */}
      <section className="max-w-[1440px] mx-auto px-margin py-space-xl w-full">
        <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg lg:p-space-xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brass-accent/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
            <div className="lg:col-span-7">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted font-bold">
                Archival Intelligence
              </span>
              <h2 className="font-headline-lg text-headline-lg text-walnut-dark mt-1">
                Ask the catalogue a research question
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Enter a topic and the repository will assemble the matching codices, treatises and monographs from the
                live catalogue index. Semantic question answering requires a configured model provider on the server;
                until one is connected this runs a full catalogue search across titles, authors, shelfmarks and tags.
              </p>
              <form
                className="mt-space-md flex flex-col sm:flex-row gap-space-xs"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitSearch(e, query)
                }}
              >
                <div className="relative flex-1">
                  <span className="material-symbols-outlined text-[20px] text-brass-muted absolute left-3.5 top-1/2 -translate-y-1/2">
                    psychology
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-charcoal-text placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-brass-accent"
                    placeholder="e.g. hydrology in Renaissance notebooks"
                    type="text"
                    aria-label="Ask the catalogue"
                  />
                </div>
                <button
                  type="submit"
                  className="px-space-lg py-3 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-walnut-dark transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary-container">search</span>
                  Search the index
                </button>
              </form>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-parchment/70 rounded-xl p-space-md">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted block mb-2">
                  Try one of these
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Renaissance hydrology', 'Copernican astronomy', 'Roman law', 'Illuminated chant', 'Anatomy plates'].map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => submitSearch(e, s)}
                        className="bg-surface-container-lowest hover:bg-parchment text-walnut-dark font-label-sm text-label-sm px-3 py-1.5 rounded-full shadow-sm transition-colors"
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dispatch */}
      <section className="max-w-[1440px] mx-auto px-margin pb-space-xl w-full">
        <div className="bg-primary-container text-parchment rounded-xl p-space-lg lg:p-space-xl shadow-lg relative overflow-hidden">
          <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-brass-accent/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-space-xs">
                <span className="material-symbols-outlined text-brass-accent text-[22px]">mail</span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-accent">
                  Monthly Dispatch
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-cream-surface leading-snug">
                The Athenaeum Paleography Gazette
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant/80 text-parchment/70 mt-2 leading-relaxed">
                Acquisitions, conservation notes and newly digitised folios, sent to registered scholars each month.
                Membership is managed from your scholar profile.
              </p>
            </div>
            <Link
              to="/register"
              className="shrink-0 px-space-lg py-3 rounded-lg bg-brass-accent text-walnut-dark font-label-lg text-label-lg font-semibold hover:bg-brass-muted hover:text-on-primary transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              Request scholarly access
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
