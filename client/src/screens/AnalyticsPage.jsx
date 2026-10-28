import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ErrorState, LoadingBlock } from '../components/StateBlocks'
import { BookThumb } from '../components/BookCard'
import { formatDateTime } from '../lib/format'

const LEDGER_TONE = {
  acquire: { icon: 'add_box', className: 'text-brass-muted', label: 'Accession' },
  discard: { icon: 'delete', className: 'text-error', label: 'Deaccession' },
  borrow: { icon: 'north_east', className: 'text-secondary', label: 'Loan issued' },
  return: { icon: 'south_west', className: 'text-walnut-dark', label: 'Return' },
  adjust: { icon: 'tune', className: 'text-outline', label: 'Adjustment' },
}

function KpiCard({ label, value, sub, icon, tone = 'default' }) {
  const dark = tone === 'dark'
  return (
    <div className={`p-space-md rounded-xl shadow-sm ${dark ? 'bg-primary-container' : 'bg-surface-container-lowest'}`}>
      <div className="flex items-center justify-between mb-space-xs">
        <span className={`font-label-sm text-label-sm uppercase tracking-wider ${dark ? 'text-parchment/70' : 'text-on-surface-variant'}`}>
          {label}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${dark ? 'text-brass-accent' : 'text-on-surface-variant'}`}>
          {icon}
        </span>
      </div>
      <span className={`font-headline-md text-headline-md block ${dark ? 'text-cream-surface' : 'text-walnut-dark'}`}>
        {value}
      </span>
      {sub && (
        <span className={`font-body-sm text-body-sm block mt-1 ${dark ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
          {sub}
        </span>
      )}
    </div>
  )
}

function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((t) => t.borrowed))
  if (trend.length === 0) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant">
        No circulation history has been recorded yet.
      </p>
    )
  }
  return (
    <div>
      <div className="flex items-end gap-2 h-48">
        {trend.map((t) => {
          const height = Math.round((t.borrowed / max) * 100)
          const [year, month] = t.month.split('-')
          const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'short' })
          return (
            <div key={t.month} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group">
              <span className="font-label-sm text-label-sm text-walnut-dark opacity-0 group-hover:opacity-100 transition-opacity">
                {t.borrowed}
              </span>
              <div
                className="w-full rounded-t bg-brass-accent/70 group-hover:bg-brass-accent transition-all min-h-[3px]"
                style={{ height: `${Math.max(3, height)}%` }}
                title={`${label} ${year}: ${t.borrowed} loans issued`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {trend.map((t) => {
          const [year, month] = t.month.split('-')
          return (
            <div key={t.month} className="flex-1 text-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                {new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [categorySort, setCategorySort] = useState('titles')

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api
      .analytics()
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((err) => setState({ status: 'error', data: null, error: err.message }))
  }, [])

  useEffect(load, [load])

  const categories = useMemo(() => {
    const rows = [...(state.data?.byCategory || [])]
    if (categorySort === 'titles') rows.sort((a, b) => b.titles - a.titles)
    if (categorySort === 'onLoan') rows.sort((a, b) => b.onLoan - a.onLoan)
    if (categorySort === 'available') rows.sort((a, b) => b.available - a.available)
    return rows
  }, [state.data, categorySort])

  if (state.status === 'loading') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <LoadingBlock label="Aggregating the archival ledger…" rows={6} />
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

  const { kpis, trend, topBooks, languages, recentLedger, generatedAt } = state.data

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">insights</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-semibold">Curator Analytics</span>
      </nav>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
              Curator Intelligence
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Compiled {formatDateTime(generatedAt)}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">
            Curator & Archival Operations Intelligence
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Every figure on this page is aggregated live from the catalogue and the circulation ledger — no
            demonstration data. Use it to balance acquisitions, staffing and preservation priorities.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={load}
            className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh aggregates
          </button>
          <Link
            to="/inventory"
            className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            Open inventory desk
          </Link>
        </div>
      </header>

      <section aria-labelledby="kpi-heading" className="mt-space-lg">
        <h2 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-sm" id="kpi-heading">
          Vault Ledger & Operational Metrics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
          <KpiCard label="Catalogued Titles" value={kpis.titles} sub="Distinct records in the catalogue" icon="library_books" />
          <KpiCard label="Copies Under Management" value={kpis.totalCopies} sub={`${kpis.availableCopies} on the shelf`} icon="inventory_2" />
          <KpiCard label="Active Loans" value={kpis.onLoan} sub={`${kpis.dueSoon} due within three days`} icon="swap_horiz" tone="dark" />
          <KpiCard label="Overdue Recalls" value={kpis.overdue} sub="Require desk follow-up" icon="report" />
          <KpiCard label="Shelf Utilisation" value={`${kpis.utilisation}%`} sub="Share of copies currently on loan" icon="monitoring" />
          <KpiCard label="Return Rate" value={`${kpis.returnRate}%`} sub="Loans returned against loans issued" icon="assignment_turned_in" />
          <KpiCard label="Mean Loan Length" value={`${kpis.avgLoanDays} days`} sub="Across all completed returns" icon="schedule" />
          <KpiCard label="Registered Scholars" value={kpis.scholars} sub={`${kpis.acquisitionsLast90Days} titles added in 90 days`} icon="groups" />
        </div>
      </section>

      <section className="mt-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="flex items-center justify-between mb-space-md gap-2 flex-wrap">
            <h3 className="font-headline-sm text-headline-sm text-walnut-dark">Circulation Velocity</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Loans issued per month · last 12 months
            </span>
          </div>
          <TrendChart trend={trend} />
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <h3 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-md">Holdings by Codex Language</h3>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <Link
                key={l}
                to={`/catalog?codexLanguage=${encodeURIComponent(l)}`}
                className="px-3 py-1.5 rounded-full bg-parchment hover:bg-surface-container-high font-label-sm text-label-sm text-charcoal-text transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
          <div className="mt-space-md pt-space-md border-t border-border-subtle">
            <h3 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-xs">Access Modality</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {kpis.availableCopies} of {kpis.totalCopies} copies are immediately requestable, giving an effective
              availability ratio of{' '}
              <strong className="text-walnut-dark font-semibold">
                {kpis.totalCopies ? Math.round((kpis.availableCopies / kpis.totalCopies) * 100) : 0}%
              </strong>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="mt-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="flex items-center justify-between mb-space-md">
            <h3 className="font-headline-sm text-headline-sm text-walnut-dark">Most Requested Masterworks</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              By lifetime loans
            </span>
          </div>
          {topBooks.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">No loans have been recorded yet.</p>
          ) : (
            <ol className="space-y-space-sm">
              {topBooks.map((b, i) => (
                <li key={b._id} className="flex items-center gap-space-sm">
                  <span className="w-6 h-6 rounded-full bg-parchment text-walnut-dark font-label-sm text-label-sm flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <BookThumb book={b} to={`/books/${b._id}`} subtitle={b.author} />
                  <span className="ml-auto shrink-0 text-right">
                    <span className="font-label-lg text-label-lg text-walnut-dark block">{b.loans}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">loans</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <div className="flex items-center justify-between mb-space-md gap-2 flex-wrap">
            <h3 className="font-headline-sm text-headline-sm text-walnut-dark">Archival Discipline Breakdown</h3>
            <select
              value={categorySort}
              onChange={(e) => setCategorySort(e.target.value)}
              className="bg-surface-container-low px-3 py-1.5 rounded font-label-md text-label-md text-walnut-dark focus:outline-none cursor-pointer"
              aria-label="Sort disciplines"
            >
              <option value="titles">Sort: Titles held</option>
              <option value="onLoan">Sort: Copies on loan</option>
              <option value="available">Sort: Copies available</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant border-b border-border-subtle">
                  <th className="py-2 pr-3 font-semibold">Discipline</th>
                  <th className="py-2 px-3 font-semibold text-center">Titles</th>
                  <th className="py-2 px-3 font-semibold text-center">Copies</th>
                  <th className="py-2 px-3 font-semibold text-center">On shelf</th>
                  <th className="py-2 px-3 font-semibold text-center">On loan</th>
                  <th className="py-2 pl-3 font-semibold">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {categories.map((c) => {
                  const pct = c.copies ? Math.round((c.available / c.copies) * 100) : 0
                  return (
                    <tr key={c.slug} className="hover:bg-parchment/40 transition-colors">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/catalog?category=${c.slug}`}
                          className="flex items-center gap-2 text-walnut-dark hover:text-brass-muted transition-colors"
                        >
                          <span className="material-symbols-outlined text-brass-muted text-[18px]">{c.icon}</span>
                          <span className="font-label-md text-label-md">{c.name}</span>
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-center font-body-md text-body-md text-charcoal-text">{c.titles}</td>
                      <td className="py-2 px-3 text-center font-body-md text-body-md text-charcoal-text">{c.copies}</td>
                      <td className="py-2 px-3 text-center font-body-md text-body-md text-walnut-dark">{c.available}</td>
                      <td className="py-2 px-3 text-center font-body-md text-body-md text-on-surface-variant">{c.onLoan}</td>
                      <td className="py-2 pl-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                            <div className="h-full bg-brass-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
        <div className="flex items-center justify-between mb-space-md gap-2 flex-wrap">
          <h2 className="font-headline-sm text-headline-sm text-walnut-dark" id="preservation-ledger-heading">
            Inventory & Circulation Audit Ledger
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Most recent 12 movements
          </span>
        </div>
        {recentLedger.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">The audit ledger is empty.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {recentLedger.map((t) => {
              const tone = LEDGER_TONE[t.type] || LEDGER_TONE.adjust
              return (
                <li key={t.id} className="py-space-sm flex flex-col sm:flex-row sm:items-center gap-space-sm justify-between">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <span className={`material-symbols-outlined text-[20px] ${tone.className}`}>{tone.icon}</span>
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-walnut-dark truncate">
                        {tone.label} — {t.book?.title || 'Unknown title'}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{t.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-md shrink-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t.totalBefore} → {t.totalAfter} copies
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t.actor}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                      {formatDateTime(t.createdAt)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
