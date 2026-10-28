import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks'

/** Presentation grouping for the domain pills (stable, not derived from user data). */
const DOMAINS = [
  { id: 'all', label: 'All Domains', slugs: null },
  { id: 'stem', label: 'STEM & Computing', slugs: ['computer-science', 'engineering', 'natural-sciences'] },
  { id: 'humanities', label: 'Humanities & Letters', slugs: ['literature-philology', 'history-archaeology', 'philosophy'] },
  { id: 'arts', label: 'Arts & Liturgics', slugs: ['musicology', 'fiction-narrative', 'ethics-flourishing'] },
  { id: 'applied', label: 'Applied & Professional', slugs: ['law', 'cartography', 'business-economics'] },
]

const CLASSIFICATION = {
  'computer-science': 'LC QA75–76 • Dewey 004',
  engineering: 'LC TA–TJ • Dewey 620',
  'natural-sciences': 'LC Q–QC • Dewey 500',
  'literature-philology': 'LC PN–PQ • Dewey 800',
  'history-archaeology': 'LC D–DG • Dewey 900',
  philosophy: 'LC B–BJ • Dewey 100',
  cartography: 'LC GA • Dewey 526',
  law: 'LC K–KZ • Dewey 340',
  musicology: 'LC M–MT • Dewey 780',
  'business-economics': 'LC HB–HJ • Dewey 330',
  'fiction-narrative': 'LC PN • Dewey 808',
  'ethics-flourishing': 'LC BJ • Dewey 170',
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('all')
  const [view, setView] = useState('grid')

  function load() {
    setState((s) => ({ ...s, status: 'loading' }))
    api
      .categories()
      .then((res) => setState({ status: 'ready', items: res.items, error: '' }))
      .catch((err) => setState((s) => ({ ...s, status: 'error', error: err.message })))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const domainSlugs = DOMAINS.find((d) => d.id === domain)?.slugs
    return state.items.filter((c) => {
      if (domainSlugs && !domainSlugs.includes(c.slug)) return false
      if (!term) return true
      return (
        c.name.toLowerCase().includes(term) ||
        (c.description || '').toLowerCase().includes(term) ||
        (CLASSIFICATION[c.slug] || '').toLowerCase().includes(term)
      )
    })
  }, [state.items, query, domain])

  const totals = useMemo(
    () =>
      state.items.reduce(
        (acc, c) => ({
          titles: acc.titles + c.titleCount,
          copies: acc.copies + c.copyCount,
          available: acc.available + c.availableCount,
        }),
        { titles: 0, copies: 0, available: 0 }
      ),
    [state.items]
  )

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">menu_book</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-medium">Taxonomies</span>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-brass-muted">Academic Disciplines</span>
      </nav>

      <header>
        <div className="flex items-center gap-space-sm mb-space-sm">
          <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
            Universal Classification
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {state.items.length} live disciplines
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">
          Explore Archival Disciplines & Modern Knowledge Domains
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm leading-relaxed max-w-4xl">
          Browse the repository structured into the sciences, applied arts, humanistic inquiries and practical tracts.
          Each discipline gathers rare manuscripts, peer-reviewed treatises and monographs preserved under archival
          standards — and every count below is drawn from the live catalogue.
        </p>
      </header>

      <div className="mt-space-lg bg-cream-surface rounded-xl p-space-md shadow-sm">
        <div className="flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              manage_search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-lowest text-charcoal-text font-body-md text-body-md rounded-lg focus:outline-none focus:ring-2 focus:ring-brass-accent/30 transition-all placeholder:text-on-surface-variant/60"
              id="disciplineSearchInput"
              placeholder="Filter disciplines, classification numbers (e.g. QA, Dewey 800), or sub-fields…"
              type="search"
            />
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <div className="flex items-center bg-parchment p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 rounded font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                  view === 'grid' ? 'bg-cream-surface text-walnut-dark shadow-sm' : 'text-on-surface-variant hover:text-walnut-dark'
                }`}
                aria-label="Visual grid view"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span>Visual Folios</span>
              </button>
              <button
                type="button"
                onClick={() => setView('shelf')}
                className={`px-3 py-1.5 rounded font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                  view === 'shelf' ? 'bg-cream-surface text-walnut-dark shadow-sm' : 'text-on-surface-variant hover:text-walnut-dark'
                }`}
                aria-label="Compact shelf list view"
              >
                <span className="material-symbols-outlined text-[16px]">view_timeline</span>
                <span>Shelf Index</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-space-xs mt-space-md pt-space-sm flex-wrap">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted mr-1">Domains:</span>
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDomain(d.id)}
              className={`px-3 py-1 rounded-full font-label-sm text-label-sm transition-all ${
                domain === d.id
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-parchment text-charcoal-text hover:bg-surface-container-high'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="mt-space-lg">
          <SkeletonCards count={8} />
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-space-lg">
          <ErrorState message={state.error} onRetry={load} />
        </div>
      )}

      {state.status === 'ready' && filtered.length === 0 && (
        <div className="mt-space-lg">
          <EmptyState
            title="No disciplines match that filter"
            body="Try a different classification number, or clear the domain pill to see the whole taxonomy."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setDomain('all')
                }}
                className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}

      {state.status === 'ready' && filtered.length > 0 && view === 'grid' && (
        <div className="mt-space-lg grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {filtered.map((c) => {
            const onLoan = Math.max(0, c.copyCount - c.availableCount)
            return (
              <article
                key={c.id}
                className="bg-cream-surface rounded-xl p-space-lg flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-space-sm mb-space-md">
                    <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[24px] text-brass-accent">{c.icon}</span>
                    </div>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider bg-parchment text-brass-muted px-2 py-0.5 rounded text-right">
                      {CLASSIFICATION[c.slug] || 'Athenaeum Class'}
                    </span>
                  </div>

                  <span className="font-label-sm text-label-sm text-brass-muted tracking-widest uppercase">
                    {c.collectionNote || 'General Collection'}
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-walnut-dark group-hover:text-primary transition-colors mt-0.5 leading-snug">
                    {c.name}
                  </h2>

                  <div className="inline-flex items-center gap-1.5 mt-2 mb-space-sm font-label-sm text-label-sm text-walnut-dark bg-secondary-container/20 px-2.5 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[13px] text-brass-muted">database</span>
                    <span>
                      {c.titleCount} {c.titleCount === 1 ? 'Title' : 'Titles'} • {c.copyCount} Copies
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-md">
                    {c.description}
                  </p>

                  <div className="p-space-sm rounded-lg bg-surface-container-low mb-space-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm text-walnut-dark uppercase tracking-wider">
                        Shelf status
                      </span>
                      <span className="font-label-sm text-label-sm text-brass-muted">
                        {c.availableCount} available
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full bg-brass-accent transition-all"
                        style={{ width: `${c.copyCount ? Math.round((c.availableCount / c.copyCount) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                      {onLoan} {onLoan === 1 ? 'copy' : 'copies'} currently on loan
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/catalog?category=${c.slug}`)}
                    className="flex-1 py-2 px-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded hover:bg-walnut-dark transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    <span>Browse discipline</span>
                  </button>
                  <Link
                    to="/catalog"
                    className="px-3 py-2 rounded bg-surface-container-low hover:bg-surface-container text-walnut-dark font-label-sm text-label-sm transition-colors"
                    title="Open the full catalogue"
                  >
                    All
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {state.status === 'ready' && filtered.length > 0 && view === 'shelf' && (
        <div className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-parchment/70">
                <tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Discipline</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Inventory Folios</th>
                  <th className="py-3 px-4">Copies</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">On Loan</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-parchment/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-brass-muted text-[20px]">{c.icon}</span>
                        <span className="font-label-md text-label-md text-walnut-dark">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {CLASSIFICATION[c.slug] || '—'}
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-charcoal-text">{c.titleCount}</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-charcoal-text">{c.copyCount}</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-walnut-dark">{c.availableCount}</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                      {Math.max(0, c.copyCount - c.availableCount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/catalog?category=${c.slug}`}
                        className="font-label-sm text-label-sm text-brass-muted hover:text-secondary uppercase tracking-wider"
                      >
                        Browse →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repository register */}
      <section className="mt-space-xl">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md text-center">
            <div>
              <span className="font-headline-md text-headline-md text-walnut-dark block">{state.items.length}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Disciplines</span>
            </div>
            <div>
              <span className="font-headline-md text-headline-md text-walnut-dark block">{totals.titles}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Catalogued Titles</span>
            </div>
            <div>
              <span className="font-headline-md text-headline-md text-walnut-dark block">{totals.copies}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Physical Copies</span>
            </div>
            <div>
              <span className="font-headline-md text-headline-md text-walnut-dark block">{totals.available}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">On The Shelf</span>
            </div>
          </div>
        </div>

        <div className="mt-space-md bg-primary-container text-parchment rounded-xl p-space-lg shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
          <div>
            <h3 className="font-headline-md text-headline-md text-cream-surface">Need an Inter-Disciplinary Reading Syllabus?</h3>
            <p className="font-body-md text-body-md text-parchment/70 mt-1 max-w-2xl">
              The catalogue supports cross-discipline concordances. Search across every taxonomy at once, or ask a
              curator to assemble a reading list for your seminar.
            </p>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <Link
              to="/catalog"
              className="px-space-lg py-3 rounded-lg bg-brass-accent text-walnut-dark font-label-lg text-label-lg font-semibold hover:bg-brass-muted hover:text-on-primary transition-colors"
            >
              Search everything
            </Link>
            <Link
              to="/circulation"
              className="px-space-lg py-3 rounded-lg bg-walnut-dark/60 text-cream-surface font-label-lg text-label-lg hover:bg-walnut-dark transition-colors"
            >
              Ask a curator
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
