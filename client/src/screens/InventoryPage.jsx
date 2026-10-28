import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorState, LoadingBlock } from '../components/StateBlocks'
import { BookThumb } from '../components/BookCard'

const EMPTY_FORM = {
  title: '',
  author: '',
  authorDates: '',
  category: '',
  publishedYear: '',
  publisher: '',
  codexLanguage: 'Latin',
  pages: '',
  shelfmark: '',
  callNumber: '',
  collectionName: '',
  accessTier: 'Open Access IIIF',
  digitalFidelity: '1200 DPI Multispectral',
  location: 'Reading Room Vault',
  coverImage: '/assets/stitch/ab2120dc13.jpg',
  description: '',
  excerpt: '',
  rating: '4.8',
  citationCount: '0',
  totalCopies: '1',
  tags: '',
}

function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-walnut-dark/50 backdrop-blur-sm p-4 sm:p-space-lg">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} bg-surface-container-lowest rounded-xl shadow-2xl animate-fade-in-up my-auto`}>
        <div className="flex items-start justify-between gap-space-md p-space-md border-b border-border-subtle">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-walnut-dark">{title}</h2>
            {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-parchment transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-space-md max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children, hint, error }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark">{label}</span>
      {children}
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
      {error && <span className="font-body-sm text-body-sm text-error">{error}</span>}
    </label>
  )
}

const inputClass =
  'w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)] transition-all'

export default function InventoryPage() {
  const toast = useToast()
  const [data, setData] = useState({ status: 'loading', items: [], facets: null, error: '' })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // {type:'create'|'edit'|'stock', book?}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [stockForm, setStockForm] = useState({ delta: '1', reason: '' })
  const [formErrors, setFormErrors] = useState({})

  const load = useCallback(() => {
    setData((d) => ({ ...d, status: 'loading' }))
    api
      .books({ search, category, availability: stockFilter, page, limit: 12, sort: 'shelfmark' })
      .then((res) => setData({ status: 'ready', items: res.items, facets: res.facets, total: res.total, pages: res.pages, error: '' }))
      .catch((err) => setData((d) => ({ ...d, status: 'error', error: err.message })))
  }, [search, category, stockFilter, page])

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const kpis = useMemo(() => {
    const items = data.items || []
    const copies = items.reduce((a, b) => a + b.totalCopies, 0)
    const available = items.reduce((a, b) => a + b.availableCopies, 0)
    const onLoan = items.reduce((a, b) => a + b.activeLoans, 0)
    return {
      titles: data.total ?? items.length,
      copies,
      available,
      onLoan,
      zeroStock: items.filter((b) => b.availableCopies === 0).length,
      utilisation: copies ? Math.round(((copies - available) / copies) * 100) : 0,
    }
  }, [data])

  const alerts = useMemo(() => (data.items || []).filter((b) => b.availableCopies === 0), [data.items])
  const recommendations = useMemo(
    () =>
      [...(data.items || [])]
        .sort((a, b) => b.activeLoans - a.activeLoans || a.availableCopies - b.availableCopies)
        .slice(0, 4),
    [data.items]
  )

  function openCreate() {
    setForm({ ...EMPTY_FORM, category: data.facets?.categories?.[0]?.slug || '' })
    setFormErrors({})
    setModal({ type: 'create' })
  }

  function openEdit(book) {
    setForm({
      ...EMPTY_FORM,
      title: book.title,
      author: book.author,
      authorDates: book.authorDates || '',
      category: book.category?.slug || '',
      publishedYear: book.publishedYear ?? '',
      publisher: book.publisher || '',
      codexLanguage: book.codexLanguage || 'Latin',
      pages: book.pages ?? '',
      shelfmark: book.shelfmark || '',
      callNumber: book.callNumber || '',
      collectionName: book.collectionName || '',
      accessTier: book.accessTier || 'Open Access IIIF',
      digitalFidelity: book.digitalFidelity || '',
      location: book.location || '',
      coverImage: book.coverImage || '',
      description: book.description || '',
      excerpt: book.excerpt || '',
      rating: book.rating ?? '4.8',
      citationCount: book.citationCount ?? '0',
      totalCopies: book.totalCopies,
      tags: (book.tags || []).join(', '),
    })
    setFormErrors({})
    setModal({ type: 'edit', book })
  }

  function openStock(book) {
    setStockForm({ delta: '1', reason: '' })
    setFormErrors({})
    setModal({ type: 'stock', book })
  }

  function payloadFromForm() {
    const categoryId = data.facets?.categories?.find((c) => c.slug === form.category)?.id || form.category
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      category: categoryId,
      description: form.description.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const numeric = ['publishedYear', 'pages', 'citationCount']
    const strings = [
      'authorDates',
      'publisher',
      'codexLanguage',
      'shelfmark',
      'callNumber',
      'collectionName',
      'accessTier',
      'digitalFidelity',
      'location',
      'coverImage',
      'excerpt',
      'rating',
    ]
    numeric.forEach((k) => {
      if (form[k] !== '' && form[k] !== null) payload[k] = Number(form[k])
    })
    strings.forEach((k) => {
      if (form[k]) payload[k] = form[k]
    })
    return payload
  }

  async function submitBook(e) {
    e.preventDefault()
    const errors = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.author.trim()) errors.author = 'Author is required'
    if (!form.category) errors.category = 'Select a discipline'
    if (!form.description.trim()) errors.description = 'A description is required'
    setFormErrors(errors)
    if (Object.keys(errors).length) return

    setSaving(true)
    try {
      if (modal.type === 'create') {
        const total = Number(form.totalCopies || 1)
        await api.createBook({ ...payloadFromForm(), totalCopies: total, availableCopies: total })
        toast.success(`“${form.title.trim()}” accessioned into the catalogue with ${total} ${total === 1 ? 'copy' : 'copies'}.`)
      } else {
        await api.updateBook(modal.book.id, payloadFromForm())
        toast.success(`Record updated for “${form.title.trim()}”.`)
      }
      setModal(null)
      load()
    } catch (err) {
      setFormErrors({ ...(err.fieldErrors || {}), form: err.message })
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitStock(e) {
    e.preventDefault()
    const delta = Number(stockForm.delta)
    if (!Number.isInteger(delta) || delta === 0) {
      setFormErrors({ delta: 'Enter a non-zero whole number' })
      return
    }
    if (stockForm.reason.trim().length < 3) {
      setFormErrors({ reason: 'A reason of at least 3 characters is required for the audit ledger' })
      return
    }
    setSaving(true)
    try {
      const res = await api.adjustStock(modal.book.id, { delta, reason: stockForm.reason.trim() })
      toast.success(
        `Stock ${delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(delta)} — now ${res.book.availableCopies} of ${res.book.totalCopies} available.`
      )
      setModal(null)
      load()
    } catch (err) {
      setFormErrors({ form: err.message })
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <nav className="flex items-center gap-space-xs pb-space-md font-label-md text-label-md text-on-surface-variant/80 flex-wrap">
        <Link className="hover:text-walnut-dark transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[16px]">inventory_2</span> Athenaeum
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-walnut-dark font-semibold">Archival Inventory & Stock Management</span>
      </nav>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm mb-space-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-brass-accent/15 text-brass-muted font-label-sm text-label-sm tracking-widest uppercase">
              Curator Privileges
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Live ledger · every change audited
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">
            Archival Inventory & Stock Integrity Control
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Accession new acquisitions, correct catalogue metadata and adjust holdings. Quantities are guarded so
            copies can never go negative and the total can never fall below the number currently on loan.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={openCreate}
            className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Accession a new folio
          </button>
          <Link
            to="/admin/analytics"
            className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">insights</span>
            Curator analytics
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md mt-space-lg">
        {[
          ['Library Titles', kpis.titles, 'folder_copy', 'Default'],
          ['Copies Under Management', kpis.copies, 'inventory_2', 'Default'],
          ['Available Holdings', kpis.available, 'check_circle', 'Brass'],
          ['On Loan', kpis.onLoan, 'swap_horiz', 'Default'],
          ['Shelf Utilisation', `${kpis.utilisation}%`, 'monitoring', 'Error'],
        ].map(([label, value, icon, tone], i) => (
          <div key={label} className={`p-space-md rounded-xl shadow-sm ${i === 4 ? 'bg-primary-container' : 'bg-surface-container-lowest'}`}>
            <div className="flex items-center justify-between mb-space-xs">
              <span className={`font-label-sm text-label-sm uppercase tracking-wider ${i === 4 ? 'text-parchment/70' : 'text-on-surface-variant'}`}>
                {label}
              </span>
              <span className={`material-symbols-outlined text-[20px] ${i === 4 ? 'text-brass-accent' : tone === 'Brass' ? 'text-brass-muted' : 'text-on-surface-variant'}`}>
                {icon}
              </span>
            </div>
            <div className={`font-label-md text-label-md ${i === 4 ? 'text-secondary-fixed-dim' : 'text-secondary'}`}>
              {i === 4 ? 'Repository capacity' : 'Live figures'}
            </div>
            <span className={`font-headline-md text-headline-md block ${i === 4 ? 'text-cream-surface' : 'text-walnut-dark'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
          <div className="flex items-center gap-2 mb-space-sm">
            <span className="material-symbols-outlined text-error text-[22px]">warning</span>
            <h2 className="font-headline-sm text-headline-sm text-walnut-dark leading-tight">
              Urgent Stock & Vault Preservation Alerts
            </h2>
          </div>
          <div className="space-y-space-sm">
            {alerts.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-error-container/25 ring-1 ring-error/20 rounded-lg p-space-sm"
              >
                <div>
                  <h3 className="font-headline-sm text-[17px] leading-snug text-walnut-dark">{b.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    All {b.totalCopies} {b.totalCopies === 1 ? 'copy is' : 'copies are'} currently out on circulation.
                    {b.activeLoans > 0 && ` ${b.activeLoans} active ${b.activeLoans === 1 ? 'loan' : 'loans'} outstanding.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openStock(b)}
                  className="shrink-0 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors"
                >
                  Acquire replacement copies
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Registry */}
      <section className="mt-space-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm mb-space-sm">
          <h2 className="font-headline-md text-headline-md text-walnut-dark">Codex Registry & Bay Location Master</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 pr-3 py-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-brass-accent w-full sm:w-64"
                placeholder="Search title, author, shelfmark…"
                type="search"
                aria-label="Search inventory"
              />
            </div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="bg-surface-container-low px-3 py-2 rounded-lg font-label-md text-label-md text-walnut-dark focus:outline-none cursor-pointer"
              aria-label="Filter by discipline"
            >
              <option value="">All disciplines</option>
              {(data.facets?.categories || []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value)
                setPage(1)
              }}
              className="bg-surface-container-low px-3 py-2 rounded-lg font-label-md text-label-md text-walnut-dark focus:outline-none cursor-pointer"
              aria-label="Filter by stock state"
            >
              <option value="">All stock states</option>
              <option value="available">Available (copies on shelf)</option>
              <option value="unavailable">Zero holdings</option>
              <option value="onloan">Partially on loan</option>
            </select>
          </div>
        </div>

        {data.status === 'loading' && <LoadingBlock label="Reading the inventory ledger…" rows={5} />}
        {data.status === 'error' && <ErrorState message={data.error} onRetry={load} />}
        {data.status === 'ready' && data.items.length === 0 && (
          <EmptyState
            icon="inventory_2"
            title="No records match this inventory filter"
            body="Adjust the discipline or stock-state filter, or accession a new folio into the catalogue."
            action={
              <button
                type="button"
                onClick={openCreate}
                className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
              >
                Accession a new folio
              </button>
            }
          />
        )}

        {data.status === 'ready' && data.items.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-parchment/70">
                  <tr className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3.5 px-4 font-semibold" scope="col">
                      Codex & Catalog Shelfmark
                    </th>
                    <th className="py-3.5 px-4 font-semibold" scope="col">
                      Repository Bay
                    </th>
                    <th className="py-3.5 px-4 font-semibold" scope="col">
                      Circulation & Physical State
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-center" scope="col">
                      Copies Held
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-center" scope="col">
                      Velocity
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-right" scope="col">
                      Archival Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.items.map((b) => {
                    const zero = b.availableCopies === 0
                    return (
                      <tr key={b.id} className={`transition-colors ${zero ? 'bg-error-container/20' : 'hover:bg-parchment/40'}`}>
                        <td className="py-3 px-4">
                          <BookThumb book={b} to={`/books/${b.id}`} subtitle={b.category?.name || 'Uncategorised'} />
                          <span className="font-body-sm text-body-sm text-on-surface-variant font-mono block mt-1 truncate">
                            {b.shelfmark}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-label-md text-label-md text-walnut-dark block">{b.location || '—'}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{b.collectionName || 'General'}</span>
                        </td>
                        <td className="py-3 px-4">
                          {zero ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-error" /> Zero holdings
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container/50 text-on-secondary-fixed font-label-sm text-label-sm uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Available in vault
                            </span>
                          )}
                          <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                            {b.activeLoans} active {b.activeLoans === 1 ? 'loan' : 'loans'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-label-lg text-label-lg text-walnut-dark block">
                            {b.availableCopies} / {b.totalCopies}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {b.totalCopies - b.availableCopies} out
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-label-md text-label-md text-walnut-dark block">
                            {(b.citationCount || 0).toLocaleString('en-GB')}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">citations</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openStock(b)}
                              className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors"
                              title="Adjust holdings"
                            >
                              Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(b)}
                              className="px-2.5 py-1 rounded bg-parchment hover:bg-surface-container text-brass-muted font-label-sm text-label-sm transition-colors"
                              title="Edit metadata"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data.pages > 1 && (
              <div className="flex items-center justify-between gap-space-sm p-space-sm border-t border-border-subtle">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Page {page} of {data.pages} • {data.total} titles
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low font-label-sm text-label-sm text-walnut-dark hover:bg-parchment transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low font-label-sm text-label-sm text-walnut-dark hover:bg-parchment transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mt-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <h2 className="font-headline-lg text-headline-md text-walnut-dark">Restock & Holdings Acquisition Recommendations</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-space-md">
            Derived from live circulation pressure — titles with the most outstanding loans and the fewest copies on the
            shelf.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
            {recommendations.map((b) => (
              <div key={b.id} className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between">
                <BookThumb book={b} to={`/books/${b.id}`} subtitle={b.author} />
                <div className="mt-space-sm flex items-center justify-between">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted block">
                      Pressure
                    </span>
                    <span className="font-label-lg text-label-lg text-walnut-dark">
                      {b.activeLoans} loans / {b.availableCopies} on shelf
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openStock(b)}
                    className="px-2.5 py-1.5 rounded bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-walnut-dark transition-colors"
                  >
                    Acquire
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {modal?.type === 'create' && (
        <Modal
          title="Accession a new folio"
          subtitle="Creates a catalogue record and an initial acquisition entry in the inventory ledger."
          onClose={() => setModal(null)}
          wide
        >
          <BookForm
            form={form}
            setForm={setForm}
            errors={formErrors}
            categories={data.facets?.categories || []}
            onSubmit={submitBook}
            saving={saving}
            submitLabel="Accession into catalogue"
            showCopies
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal
          title={`Edit “${modal.book.title}”`}
          subtitle="Holdings are adjusted through the audited Stock action, not here."
          onClose={() => setModal(null)}
          wide
        >
          <BookForm
            form={form}
            setForm={setForm}
            errors={formErrors}
            categories={data.facets?.categories || []}
            onSubmit={submitBook}
            saving={saving}
            submitLabel="Save record"
          />
        </Modal>
      )}

      {modal?.type === 'stock' && (
        <Modal
          title="Adjust holdings"
          subtitle={`${modal.book.title} — currently ${modal.book.availableCopies} of ${modal.book.totalCopies} available`}
          onClose={() => setModal(null)}
        >
          <form className="space-y-space-md" onSubmit={submitStock}>
            {formErrors.form && (
              <div className="flex items-start gap-2 bg-error-container/50 ring-1 ring-error/30 rounded-lg p-space-sm">
                <span className="material-symbols-outlined text-[18px] text-error">error</span>
                <p className="font-body-sm text-body-sm text-on-error-container">{formErrors.form}</p>
              </div>
            )}
            <Field
              label="Number of copies to add or remove"
              hint={`Positive to acquire, negative to deaccession. ${modal.book.totalCopies - modal.book.availableCopies} of ${modal.book.totalCopies} are currently on loan and cannot be removed.`}
              error={formErrors.delta}
            >
              <input
                type="number"
                value={stockForm.delta}
                onChange={(e) => {
                  setStockForm((s) => ({ ...s, delta: e.target.value }))
                  setFormErrors((p) => ({ ...p, delta: undefined }))
                }}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStockForm((s) => ({ ...s, delta: String(n) }))}
                  className="px-3 py-1.5 rounded-lg bg-parchment hover:bg-surface-container font-label-sm text-label-sm text-walnut-dark transition-colors"
                >
                  +{n}
                </button>
              ))}
            </div>
            <Field label="Reason for the audit ledger" error={formErrors.reason}>
              <textarea
                rows={3}
                value={stockForm.reason}
                onChange={(e) => {
                  setStockForm((s) => ({ ...s, reason: e.target.value }))
                  setFormErrors((p) => ({ ...p, reason: undefined }))
                }}
                placeholder="e.g. Two replacement copies acquired from the Basel facsimile programme"
                className={inputClass}
              />
            </Field>
            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-space-md py-2.5 rounded-lg bg-cream-surface text-walnut-dark font-label-md text-label-md hover:bg-parchment transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors disabled:opacity-60"
              >
                {saving ? 'Writing ledger…' : 'Apply stock adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function BookForm({ form, setForm, errors, categories, onSubmit, saving, submitLabel, showCopies }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  return (
    <form className="space-y-space-md" onSubmit={onSubmit}>
      {errors.form && (
        <div className="flex items-start gap-2 bg-error-container/50 ring-1 ring-error/30 rounded-lg p-space-sm">
          <span className="material-symbols-outlined text-[18px] text-error">error</span>
          <p className="font-body-sm text-body-sm text-on-error-container">{errors.form}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <Field label="Title" error={errors.title}>
          <input value={form.title} onChange={set('title')} className={inputClass} placeholder="e.g. Harmonices Mundi" />
        </Field>
        <Field label="Author / Scribe" error={errors.author}>
          <input value={form.author} onChange={set('author')} className={inputClass} placeholder="e.g. Johannes Kepler" />
        </Field>
        <Field label="Author dates">
          <input value={form.authorDates} onChange={set('authorDates')} className={inputClass} placeholder="1571–1630" />
        </Field>
        <Field label="Discipline" error={errors.category}>
          <select value={form.category} onChange={set('category')} className={inputClass}>
            <option value="">Select a discipline</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Published year">
          <input type="number" value={form.publishedYear} onChange={set('publishedYear')} className={inputClass} placeholder="1619" />
        </Field>
        <Field label="Publisher / Imprint">
          <input value={form.publisher} onChange={set('publisher')} className={inputClass} placeholder="Gottfried Tampach, Linz" />
        </Field>
        <Field label="Codex language">
          <input value={form.codexLanguage} onChange={set('codexLanguage')} className={inputClass} />
        </Field>
        <Field label="Pages">
          <input type="number" value={form.pages} onChange={set('pages')} className={inputClass} placeholder="252" />
        </Field>
        <Field label="Shelfmark">
          <input value={form.shelfmark} onChange={set('shelfmark')} className={inputClass} placeholder="LINZ. 1619-KEP • Austrian National Library" />
        </Field>
        <Field label="Call number">
          <input value={form.callNumber} onChange={set('callNumber')} className={inputClass} placeholder="QA803.K4" />
        </Field>
        <Field label="Collection">
          <input value={form.collectionName} onChange={set('collectionName')} className={inputClass} placeholder="Rare Manuscripts & Codices" />
        </Field>
        <Field label="Repository bay / location">
          <input value={form.location} onChange={set('location')} className={inputClass} placeholder="Vault IV Room C" />
        </Field>
        <Field label="Access tier">
          <input value={form.accessTier} onChange={set('accessTier')} className={inputClass} />
        </Field>
        <Field label="Digitisation fidelity">
          <input value={form.digitalFidelity} onChange={set('digitalFidelity')} className={inputClass} />
        </Field>
        <Field label="Rating (0–5)">
          <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={set('rating')} className={inputClass} />
        </Field>
        <Field label="Citation count">
          <input type="number" min="0" value={form.citationCount} onChange={set('citationCount')} className={inputClass} />
        </Field>
        {showCopies && (
          <Field label="Copies accessioned" hint="Available copies start equal to the total.">
            <input type="number" min="0" max="5000" value={form.totalCopies} onChange={set('totalCopies')} className={inputClass} />
          </Field>
        )}
        <Field label="Cover image path">
          <input value={form.coverImage} onChange={set('coverImage')} className={inputClass} />
        </Field>
      </div>

      <Field label="Tags (comma separated)">
        <input value={form.tags} onChange={set('tags')} className={inputClass} placeholder="Latin, Astrophysics" />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea rows={4} value={form.description} onChange={set('description')} className={inputClass} />
      </Field>

      <Field label="Incipit / excerpt">
        <textarea rows={2} value={form.excerpt} onChange={set('excerpt')} className={inputClass} />
      </Field>

      <div className="flex items-center justify-end gap-space-sm pt-space-xs">
        <button
          type="submit"
          disabled={saving}
          className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
