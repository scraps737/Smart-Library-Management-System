import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const DISCIPLINES = [
  { value: '', label: 'Select Primary Discipline' },
  { value: 'Medieval & Byzantine Manuscript Studies', label: 'Medieval & Byzantine Manuscript Studies' },
  { value: 'Early Modern Print & Incunabula', label: 'Early Modern Print & Incunabula' },
  { value: 'History of Science & Natural Philosophy', label: 'History of Science & Natural Philosophy' },
  { value: 'Classical Papyrology & Epigraphy', label: 'Classical Papyrology & Epigraphy' },
  { value: 'Historical Cartography & Navigation', label: 'Historical Cartography & Navigation' },
  { value: 'Independent Humanist Research', label: 'Independent Humanist Research' },
]

const STRENGTH = {
  0: { label: 'Awaiting entry', className: 'text-outline', bars: 'bg-surface-container-highest' },
  1: { label: 'Faint / Fragile', className: 'text-error', bars: 'bg-error' },
  2: { label: 'Moderate', className: 'text-secondary', bars: 'bg-secondary-fixed-dim' },
  3: { label: 'Scholarly Grade', className: 'text-brass-muted', bars: 'bg-brass-accent' },
  4: { label: 'Archival Maximum', className: 'text-walnut-dark', bars: 'bg-primary-container' },
}

function scorePassword(value) {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1
  return Math.max(1, score)
}

function PasswordField({ id, label, value, onChange, error, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={id === 'password' ? 'new-password' : 'new-password'}
          aria-invalid={Boolean(error)}
          className={`w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all pr-10 ${
            error ? 'shadow-[0_0_0_2px_rgba(186,26,26,0.45)]' : 'focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)]'
          }`}
        />
        <button
          className="absolute right-3 top-2.5 text-outline hover:text-walnut-dark transition-colors"
          onClick={() => setVisible((v) => !v)}
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
        >
          <span className="material-symbols-outlined text-[18px]">{visible ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    affiliation: '',
    discipline: '',
    password: '',
    confirmPassword: '',
  })
  const [acceptCode, setAcceptCode] = useState(true)
  const [newsletter, setNewsletter] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => scorePassword(form.password), [form.password])
  const strengthMeta = STRENGTH[strength]

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required'
    if (!form.lastName.trim()) next.lastName = 'Family name is required'
    if (!form.email.trim()) next.email = 'An institutional email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (form.password.length < 10) next.password = 'Use at least 10 characters'
    else if (!/[A-Z]/.test(form.password)) next.password = 'Include an uppercase letter'
    else if (!/[a-z]/.test(form.password)) next.password = 'Include a lowercase letter'
    else if (!/\d/.test(form.password)) next.password = 'Include a numeral'
    else if (!/[^A-Za-z0-9]/.test(form.password)) next.password = 'Include a symbolic mark'
    if (form.password !== form.confirmPassword) next.confirmPassword = 'The two keys do not match'
    if (!acceptCode) next.terms = 'You must accept the Archival Code of Ethics to register'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const user = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        affiliation: form.affiliation.trim(),
        discipline: form.discipline,
      })
      toast.success(`Matriculation complete. Welcome to the Athenaeum, ${user.firstName}.`)
      navigate('/profile', { replace: true })
    } catch (err) {
      const fieldErrors = err.fieldErrors || {}
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : err.message })
      if (Object.keys(fieldErrors).length === 0) toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg lg:py-space-xl">
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Registry Folio</span>
          <span className="font-label-sm text-label-sm text-outline-variant">/</span>
          <span className="font-label-sm text-label-sm text-walnut-dark font-medium">
            New Humanist Matriculation • Session MMXXVI
          </span>
        </div>
        <div className="flex items-center gap-space-sm bg-parchment px-space-md py-space-xs rounded-full shadow-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-brass-accent animate-pulse" />
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-walnut-dark">
            Archival credentials issued instantly
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest p-space-lg lg:p-space-xl rounded-xl shadow-md relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-brass-accent/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-space-sm mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted">Credential Tier</span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-walnut-dark">Charter Pass</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-walnut-dark tracking-tight mb-space-sm">
              Scholarly Privileges & Open Folios
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
              Registration bestows non-commercial academic access to the full catalogued collection, academic
              concordances, and active circulation ledgers.
            </p>

            <div className="space-y-space-md mb-space-lg">
              {[
                ['zoom_in', 'High-Fidelity Deep Zoom', 'Analyse watermarks, iron gall ink degradation and vellum textures at full capture resolution.'],
                ['dataset', 'Automated BibTeX & CSL Ingestion', 'Instant one-click exports calibrated for Zotero, LaTeX and institutional bibliographic engines.'],
                ['edit_note', 'Reading History & Bookmarks', 'Keep a private ledger of every folio you consult, borrow and return.'],
                ['verified_user', 'Borrowing & Reservation Rights', 'Request physical copies and track due dates directly from your scholar profile.'],
              ].map(([icon, title, body]) => (
                <div key={title} className="flex items-start gap-space-md p-space-sm rounded-lg hover:bg-parchment/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-cream-surface flex items-center justify-center shrink-0 shadow-sm text-brass-muted">
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-walnut-dark">{title}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{body}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-cream-surface p-space-md rounded-lg shadow-sm border-l-4 border-brass-accent">
              <p className="font-headline-sm text-headline-sm italic text-walnut-dark leading-relaxed mb-space-xs">
                “The archive does not hoard the past; it breathes clarity into contemporary reasoning.”
              </p>
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Codex Custodian Council</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Oxford • Florence</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-space-md shadow-sm overflow-hidden flex flex-col gap-space-sm">
            <div className="relative w-full h-44 rounded-lg overflow-hidden shadow-inner">
              <img
                className="w-full h-full object-cover"
                src="/assets/stitch/b419c8137b.jpg"
                alt="An illuminated manuscript resting on an aged walnut library desk in warm afternoon light."
              />
              <div className="absolute bottom-2 left-2 bg-walnut-dark/80 backdrop-blur-md px-space-sm py-1 rounded text-on-primary">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed">
                  MS. Bodl. 244 • Folio 12r
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-space-xs">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Preservation digitisation funded by the International Humanities Union
              </span>
              <span className="font-label-sm text-label-sm text-brass-muted font-semibold">99.8% Fidelity</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-surface-container-lowest p-space-lg lg:p-space-xl rounded-xl shadow-lg relative">
            <div className="mb-space-lg">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted">Registry Application</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-parchment px-2 py-0.5 rounded">Form 104-B</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight leading-tight">
                Request Archival Credentials
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Join an international collective of humanists, scientists, and independent scholars.
              </p>
            </div>

            <form className="space-y-space-md" id="registrationForm" onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <div className="flex items-start gap-2 bg-error-container/50 ring-1 ring-error/30 rounded-lg p-space-sm" role="alert">
                  <span className="material-symbols-outlined text-[18px] text-error">error</span>
                  <p className="font-body-sm text-body-sm text-on-error-container">{errors.form}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={update('firstName')}
                    placeholder="e.g. Julian"
                    aria-invalid={Boolean(errors.firstName)}
                    className={`w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all ${
                      errors.firstName ? 'shadow-[0_0_0_2px_rgba(186,26,26,0.45)]' : 'focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)]'
                    }`}
                  />
                  {errors.firstName && <p className="font-body-sm text-body-sm text-error">{errors.firstName}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor="lastName">
                    Family Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={update('lastName')}
                    placeholder="e.g. Vance"
                    aria-invalid={Boolean(errors.lastName)}
                    className={`w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all ${
                      errors.lastName ? 'shadow-[0_0_0_2px_rgba(186,26,26,0.45)]' : 'focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)]'
                    }`}
                  />
                  {errors.lastName && <p className="font-body-sm text-body-sm text-error">{errors.lastName}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor="academicEmail">
                    Institutional or Academic Email
                  </label>
                  <span className="font-label-sm text-label-sm text-brass-muted">.edu, .ac.uk, .org preferred</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">school</span>
                  <input
                    id="academicEmail"
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="j.vance@bodleian.ox.ac.uk"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    className={`w-full bg-surface-container-low pl-10 pr-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all ${
                      errors.email ? 'shadow-[0_0_0_2px_rgba(186,26,26,0.45)]' : 'focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)]'
                    }`}
                  />
                </div>
                {errors.email && <p className="font-body-sm text-body-sm text-error">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor="institution">
                    Primary Affiliation
                  </label>
                  <input
                    id="institution"
                    type="text"
                    value={form.affiliation}
                    onChange={update('affiliation')}
                    placeholder="e.g. Collège de France"
                    className="w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-walnut-dark" htmlFor="discipline">
                    Research Specialisation
                  </label>
                  <select
                    id="discipline"
                    value={form.discipline}
                    onChange={update('discipline')}
                    className="w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-charcoal-text font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:shadow-[0_0_0_2px_rgba(197,155,39,0.35)] transition-all"
                  >
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value} disabled={d.value === ''}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <PasswordField
                  id="password"
                  label="Archival Password"
                  value={form.password}
                  onChange={update('password')}
                  error={errors.password}
                  placeholder="••••••••••••"
                />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm Password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  error={errors.confirmPassword}
                  placeholder="••••••••••••"
                />
              </div>

              <div className="p-space-sm bg-surface-container-low rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Archival Ledger Strength:</span>
                  <span className={`font-label-sm text-label-sm uppercase font-semibold ${strengthMeta.className}`}>
                    {strengthMeta.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`h-full w-1/4 transition-colors duration-300 ${
                        n <= (strength === 0 ? 0 : strength) ? strengthMeta.bars : 'bg-surface-container-highest'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-body-sm text-body-sm text-outline-variant block">
                  Requires 10+ characters, 1 numeral, 1 uppercase folio token, and 1 symbolic mark.
                </span>
              </div>

              <div className="space-y-space-sm pt-space-xs">
                <label className="flex items-start gap-space-sm cursor-pointer group">
                  <input
                    checked={acceptCode}
                    onChange={(e) => {
                      setAcceptCode(e.target.checked)
                      setErrors((p) => ({ ...p, terms: undefined }))
                    }}
                    className="mt-1 w-4 h-4 rounded text-walnut-dark accent-primary cursor-pointer"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm text-charcoal-text leading-tight group-hover:text-walnut-dark">
                    I solemnise compliance with the{' '}
                    <Link className="text-brass-muted font-medium underline hover:text-secondary" to="/categories">
                      Archival Code of Ethics
                    </Link>
                    , scholarly fair use standards, and the Athenaeum Open Metadata License.
                  </span>
                </label>
                {errors.terms && <p className="font-body-sm text-body-sm text-error">{errors.terms}</p>}
                <label className="flex items-start gap-space-sm cursor-pointer group">
                  <input
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-walnut-dark accent-primary cursor-pointer"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight group-hover:text-charcoal-text">
                    Enrol in the monthly scholarly dispatch:{' '}
                    <em>Athenaeum Paleography Gazette & Manuscript Acquisitions</em>.
                  </span>
                </label>
              </div>

              <div className="pt-space-sm">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-space-lg rounded-lg bg-primary-container text-cream-surface font-label-lg text-label-lg font-semibold tracking-wide shadow-md hover:bg-walnut-dark hover:text-secondary-fixed transition-all duration-200 flex items-center justify-center gap-space-sm group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Issuing credentials…' : 'Complete Archival Matriculation'}</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>

              <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Already holding archival credentials?
                  <Link
                    className="font-label-md text-label-md text-walnut-dark font-semibold hover:text-brass-muted transition-colors ml-1 underline decoration-brass-accent/40"
                    to="/login"
                  >
                    Sign In to Repository
                  </Link>
                </span>
                <Link className="font-label-sm text-label-sm text-brass-muted hover:text-secondary uppercase tracking-wider" to="/circulation">
                  Institutional Help Desk
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-space-xl pt-space-lg bg-parchment/60 rounded-xl p-space-lg shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-lg text-center">
          <div>
            <span className="font-headline-md text-headline-md text-walnut-dark block">1,420,000+</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">High-Res Codices</span>
          </div>
          <div>
            <span className="font-headline-md text-headline-md text-walnut-dark block">840+</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Affiliated Universitates</span>
          </div>
          <div>
            <span className="font-headline-md text-headline-md text-walnut-dark block">IIIF v3.0</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Standard Architecture</span>
          </div>
          <div>
            <span className="font-headline-md text-headline-md text-walnut-dark block">CC-BY 4.0</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Open Metadata License</span>
          </div>
        </div>
      </div>
    </div>
  )
}
