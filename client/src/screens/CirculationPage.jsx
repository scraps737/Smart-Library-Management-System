import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorState, LoadingBlock } from '../components/StateBlocks'
import { BookThumb } from '../components/BookCard'
import { formatDate, relativeDays } from '../lib/format'

const OVERDUE_LEVY = 25

function Stat({ icon, label, value, tone = 'default', sub }) {
  const toneClass = tone === 'error' ? 'text-error' : tone === 'brass' ? 'text-brass-muted' : 'text-walnut-dark'
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-space-xs">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className={`material-symbols-outlined text-[20px] ${toneClass}`}>{icon}</span>
      </div>
      <span className={`font-headline-md text-headline-md block ${toneClass}`}>{value}</span>
      {sub && <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">{sub}</span>}
    </div>
  )
}

function LoanRow({ loan, staff, busy, onReturn, onRenew }) {
  const overdue = loan.isOverdue
  return (
    <tr className={`transition-colors ${overdue ? 'bg-error-container/25' : 'hover:bg-parchment/40'}`}>
      <td className="py-3 px-space-md">
        <BookThumb book={loan.book} to={`/books/${loan.book?.id}`} subtitle={loan.book?.author} />
      </td>
      {staff && (
        <td className="py-3 px-space-md">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-walnut-dark">{loan.user?.name}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{loan.user?.email}</span>
          </div>
        </td>
      )}
      <td className="py-3 px-space-md font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
        {formatDate(loan.borrowedAt)}
      </td>
      <td className="py-3 px-space-md whitespace-nowrap">
        <div className="flex flex-col">
          <span className={`font-label-md text-label-md ${overdue ? 'text-error font-semibold' : 'text-charcoal-text'}`}>
            Due: {formatDate(loan.dueDate)}
          </span>
          <span className={`font-body-sm text-body-sm ${overdue ? 'text-error' : 'text-on-surface-variant'}`}>
            {overdue ? `${loan.daysOverdue} days overdue` : relativeDays(loan.dueDate)}
          </span>
        </div>
      </td>
      <td className="py-3 px-space-md whitespace-nowrap">
        {loan.status === 'returned' ? (
          <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase">
            Returned {formatDate(loan.returnedAt)}
          </span>
        ) : overdue ? (
          <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-semibold">
            Overdue
          </span>
        ) : loan.isDueSoon ? (
          <span className="px-2 py-0.5 rounded bg-secondary-container/70 text-on-secondary-fixed font-label-sm text-label-sm uppercase">
            Due soon
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-surface-container text-walnut-dark font-label-sm text-label-sm uppercase">
            {loan.renewals > 0 ? `Renewed ×${loan.renewals}` : 'On loan'}
          </span>
        )}
      </td>
      <td className="py-3 px-space-md">
        <div className="flex items-center justify-end gap-2">
          {loan.status === 'active' ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReturn(loan)}
                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-walnut-dark font-label-sm text-label-sm transition-colors disabled:opacity-50"
                title="Process return"
              >
                Return
              </button>
              <button
                type="button"
                disabled={busy || overdue}
                onClick={() => onRenew(loan)}
                className="px-2.5 py-1 rounded bg-parchment hover:bg-surface-container text-brass-muted font-label-sm text-label-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={overdue ? 'Overdue loans must be returned in person' : 'Extend loan'}
              >
                Renew
              </button>
            </>
          ) : (
            <Link
              to={`/books/${loan.book?.id}`}
              className="px-2.5 py-1 rounded bg-parchment hover:bg-surface-container text-brass-muted font-label-sm text-label-sm transition-colors"
            >
              Borrow again
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function CirculationPage() {
  const { isStaff, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [data, setData] = useState({ status: 'loading', items: [], stats: null, error: '' })
  const [busy, setBusy] = useState(false)

  // Staff rapid-dispatch state
  const [dispatchQuery, setDispatchQuery] = useState('')
  const [dispatchResults, setDispatchResults] = useState([])
  const [dispatchBusy, setDispatchBusy] = useState(false)

  const load = useCallback(() => {
    setData((d) => ({ ...d, status: 'loading' }))
    const request = isStaff ? api.loans({ status: statusFilter, search }) : api.myLoans()
    request
      .then((res) => {
        const items = isStaff ? res.items : statusFilter === 'returned' ? res.history : res.active
        setData({ status: 'ready', items, stats: res.stats, error: '' })
      })
      .catch((err) => setData((d) => ({ ...d, status: 'error', error: err.message })))
  }, [isStaff, statusFilter, search])

  useEffect(() => {
    const t = setTimeout(load, isStaff && search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, isStaff, search])

  async function processReturn(loan) {
    setBusy(true)
    try {
      await api.returnLoan(loan.id)
      toast.success(`“${loan.book?.title}” returned to the vault and the copy released.`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function processRenew(loan) {
    setBusy(true)
    try {
      const res = await api.renewLoan(loan.id)
      toast.success(`Loan extended — new due date ${formatDate(res.loan.dueDate)}.`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function runDispatch(e) {
    e.preventDefault()
    const term = dispatchQuery.trim()
    if (!term) return
    setDispatchBusy(true)
    try {
      const res = await api.loans({ status: statusFilter === 'returned' ? 'returned' : 'active', search: term })
      setDispatchResults(res.items)
      if (res.items.length === 0) toast.info('No circulation record matches that shelfmark or scholar.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDispatchBusy(false)
    }
  }

  const stats = data.stats || {}
  const overdue = useMemo(
    () => (data.items || []).filter((l) => l.isOverdue),
    [data.items]
  )

  if (data.status === 'loading' && (data.items || []).length === 0) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
        <LoadingBlock label="Opening the circulation ledger…" rows={4} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">swap_horiz</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-semibold">Borrow & Return Management</span>
      </nav>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
              {isStaff ? 'Circulation Desk' : 'My Reading Record'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {isStaff ? 'Staff privileges' : `${user?.membershipTier}`}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">
            {isStaff ? 'Archival Circulation & Vault Custody Management' : 'Your Archival Circulation Ledger'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            {isStaff
              ? 'Issue, renew and recall folios at the desk. Every movement writes to the audited inventory ledger so shelf counts always reconcile.'
              : 'Every copy you have borrowed, renewed or returned, with due dates drawn live from the repository.'}
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <Link
            to="/catalog"
            className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isStaff ? 'Issue a new loan' : 'Borrow another folio'}
          </Link>
          <Link
            to="/profile"
            className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors"
          >
            Scholar profile
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-lg">
        <Stat
          icon="sync_alt"
          label="Active Loans"
          value={stats.active ?? 0}
          tone="brass"
          sub={isStaff ? 'Across all scholars' : 'Copies you hold'}
        />
        <Stat icon="event" label="Due This Week" value={stats.dueSoon ?? stats.dueToday ?? 0} sub="Within the next 3 days" />
        <Stat
          icon="report"
          label="Overdue Recalls"
          value={stats.overdue ?? 0}
          tone="error"
          sub={`Levied at £${OVERDUE_LEVY}/day`}
        />
        <Stat
          icon="assignment_turned_in"
          label="Completed Returns"
          value={stats.returned ?? 0}
          sub={isStaff ? 'All-time desk returns' : 'In your reading history'}
        />
      </div>

      {isStaff && (
        <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
          <div className="flex items-center justify-between gap-space-sm flex-wrap mb-space-sm">
            <h2 className="font-title text-title text-walnut-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-brass-muted text-[20px]">qr_code_scanner</span>
              Rapid Shelfmark Custody Dispatch
            </h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Search by shelfmark, title or scholar
            </span>
          </div>
          <form className="flex flex-col sm:flex-row gap-space-xs" onSubmit={runDispatch}>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                barcode_scanner
              </span>
              <input
                value={dispatchQuery}
                onChange={(e) => setDispatchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low rounded-lg font-body-md text-body-md text-charcoal-text placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-brass-accent"
                placeholder="e.g. MS. BODL. 1687-NEWT, or a scholar's name"
                type="text"
                aria-label="Rapid custody dispatch"
              />
            </div>
            <button
              type="submit"
              disabled={dispatchBusy}
              className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors disabled:opacity-60"
            >
              {dispatchBusy ? 'Scanning…' : 'Locate circulation'}
            </button>
          </form>

          {dispatchResults.length > 0 && (
            <div className="mt-space-md divide-y divide-border-subtle rounded-lg overflow-hidden ring-1 ring-border-subtle">
              {dispatchResults.map((loan) => (
                <div key={loan.id} className="p-space-sm flex flex-col sm:flex-row sm:items-center gap-space-sm justify-between bg-surface-container-low/50">
                  <BookThumb book={loan.book} to={`/books/${loan.book?.id}`} subtitle={`${loan.user?.name} • due ${formatDate(loan.dueDate)}`} />
                  <div className="flex items-center gap-2 shrink-0">
                    {loan.status === 'active' && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => processReturn(loan)}
                          className="px-3 py-1.5 rounded bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors"
                        >
                          Process return
                        </button>
                        <button
                          type="button"
                          disabled={busy || loan.isOverdue}
                          onClick={() => processRenew(loan)}
                          className="px-3 py-1.5 rounded bg-parchment text-brass-muted font-label-sm text-label-sm hover:bg-surface-container transition-colors disabled:opacity-40"
                        >
                          Fast renewal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-walnut-dark">
            {isStaff ? 'Active Circulations & Folio Loans' : 'Your Loans & Reading History'}
          </h2>
          <div className="flex items-center gap-space-sm flex-wrap">
            {isStaff && (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-brass-accent"
                  placeholder="Filter loans…"
                  type="search"
                  aria-label="Filter loans"
                />
              </div>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low px-3 py-2 rounded-lg font-label-md text-label-md text-walnut-dark focus:outline-none cursor-pointer"
              aria-label="Loan status filter"
            >
              <option value="active">Status: Active Loans</option>
              <option value="overdue">Overdue Recalls Only</option>
              <option value="returned">Returned / History</option>
            </select>
          </div>
        </div>

        {data.status === 'error' && <ErrorState message={data.error} onRetry={load} />}

        {data.status !== 'error' && (data.items || []).length === 0 && (
          <EmptyState
            icon="library_books"
            title={statusFilter === 'returned' ? 'No returns recorded yet' : 'No active loans'}
            body={
              isStaff
                ? 'Nothing matches this filter on the circulation desk right now.'
                : 'Borrow a folio from the catalogue and it will appear here with its due date.'
            }
            action={
              <Link
                to="/catalog"
                className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
              >
                Browse the catalogue
              </Link>
            }
          />
        )}

        {data.status !== 'error' && (data.items || []).length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-parchment/70">
                  <tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-space-md font-semibold">Folio</th>
                    {isStaff && <th className="py-3 px-space-md font-semibold">Scholar</th>}
                    <th className="py-3 px-space-md font-semibold">Issued</th>
                    <th className="py-3 px-space-md font-semibold">Loan Period & Due Date</th>
                    <th className="py-3 px-space-md font-semibold">Status</th>
                    <th className="py-3 px-space-md font-semibold text-right">Custody</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.items.map((loan) => (
                    <LoanRow
                      key={loan.id}
                      loan={loan}
                      staff={isStaff}
                      busy={busy}
                      onReturn={processReturn}
                      onRenew={processRenew}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <h3 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-sm">
            Critical Overdue Treatises & Preservation Recalls
          </h3>
          {overdue.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              No overdue items. The shelves reconcile perfectly with the circulation ledger.
            </p>
          ) : (
            <div className="space-y-space-sm">
              {overdue.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-error-container/30 ring-1 ring-error/20 rounded-lg p-space-sm"
                >
                  <BookThumb book={l.book} to={`/books/${l.book?.id}`} subtitle={isStaff ? l.user?.name : `Due ${formatDate(l.dueDate)}`} />
                  <div className="flex items-center gap-space-sm shrink-0">
                    <span className="font-label-sm text-label-sm text-error font-semibold uppercase tracking-wider">
                      {l.daysOverdue}d overdue
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => processReturn(l)}
                      className="px-3 py-1.5 rounded bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors"
                    >
                      Process return
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <h3 className="font-headline-sm text-headline-sm text-walnut-dark mb-space-sm">Conservation Levies</h3>
          <div className="space-y-space-sm">
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
              <div>
                <span className="font-title text-title text-walnut-dark block">Standard codex overdue</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Charged per day past the due date</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-walnut-dark">£{OVERDUE_LEVY}/day</span>
            </div>
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
              <div>
                <span className="font-title text-title text-walnut-dark block">Loan period</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Renewable twice when not overdue</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-walnut-dark">21 days</span>
            </div>
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
              <div>
                <span className="font-title text-title text-walnut-dark block">Reading-room recall</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Vault-only items recalled on request</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-walnut-dark">24 h</span>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-md">
            Dues are recorded against the scholar's circulation ledger. Settle levies at the circulation desk or through
            your department's library office.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-space-md w-full py-2.5 rounded-lg bg-parchment hover:bg-surface-container-high text-walnut-dark font-label-md text-label-md transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Review my ledger
          </button>
        </div>
      </section>
    </div>
  )
}
