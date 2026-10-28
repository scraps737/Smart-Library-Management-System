import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/profile'

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.email.trim()) next.email = 'Your archival identity is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Your repository key is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const user = await login({ email: form.email.trim(), password: form.password })
      toast.success(`Welcome back, ${user.firstName}. Your reading carrel is ready.`)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const federatedNotice = (provider) =>
    toast.info(
      `${provider} sign-in requires an institutional identity provider to be configured on the server. Use your Athenaeum credentials below in the meantime.`
    )

  return (
    <div className="relative w-full overflow-hidden py-space-lg lg:py-space-xl px-4 sm:px-space-md lg:px-margin max-w-[1440px] mx-auto min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="pointer-events-none absolute -top-40 -left-20 w-96 h-96 rounded-full bg-brass-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
        {/* Archival vignette + testimony column */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-primary-container text-parchment rounded-xl p-space-xl relative overflow-hidden shadow-xl">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#C59B27 0.75px, transparent 0.75px)', backgroundSize: '16px 16px' }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-space-sm px-3 py-1.5 rounded-full bg-parchment/10 text-secondary-fixed mb-space-lg backdrop-blur-sm">
              <span className="material-symbols-outlined text-[16px] text-brass-accent">verified</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-parchment">Universal Scholar Portal</span>
              <span className="text-brass-accent text-xs">•</span>
              <span className="font-label-sm text-label-sm text-secondary-fixed-dim">Vol. XIV</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-cream-surface leading-snug tracking-tight mb-space-sm">
              The sanctuary of preserved human inquiry.
            </h2>
            <p className="font-body-md text-body-md text-parchment/80 leading-relaxed">
              Curating rare codices, illuminated fragments, and computational humanities workspaces for over 240
              collegiate libraries worldwide.
            </p>
          </div>

          <div className="relative z-10 my-space-lg pl-space-md bg-walnut-dark/40 py-space-md pr-space-md rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs text-brass-accent mb-1.5">
              <span className="material-symbols-outlined text-[18px]">format_quote</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed-dim">Archival Epigraph</span>
            </div>
            <p className="font-headline-sm text-headline-sm italic text-cream-surface font-normal leading-relaxed mb-space-xs">
              "I have always imagined that Paradise will be a kind of library."
            </p>
            <div className="flex items-center justify-between text-parchment/70 font-body-sm text-body-sm mt-space-sm">
              <span className="font-label-md text-label-md text-secondary-fixed">Jorge Luis Borges</span>
              <span className="text-xs tracking-wider opacity-60">Ficciones, 1944</span>
            </div>
          </div>

          <div className="relative z-10 space-y-space-md pt-space-md bg-primary/30 p-space-md rounded-lg">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-accent block mb-space-xs">
              Fellowship Privileges
            </span>
            <div className="flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-brass-accent/15 flex items-center justify-center shrink-0 text-secondary-fixed-dim">
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-cream-surface">4.2M+ High-Fidelity Leaves</p>
                <p className="font-body-sm text-body-sm text-parchment/70">Unrestricted deep-zoom IIIF viewing with multispectral layers.</p>
              </div>
            </div>
            <div className="flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-brass-accent/15 flex items-center justify-center shrink-0 text-secondary-fixed-dim">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-cream-surface">Paleographic AI Workspace</p>
                <p className="font-body-sm text-body-sm text-parchment/70">Autonomous transcription of uncial Greek, Latin, and Syriac cursives.</p>
              </div>
            </div>
            <div className="flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-brass-accent/15 flex items-center justify-center shrink-0 text-secondary-fixed-dim">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-cream-surface">Federated Inter-Library Loan</p>
                <p className="font-body-sm text-body-sm text-parchment/70">Immediate digitized loan delivery via consortium nodes and Oxford depots.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-space-md flex items-center justify-between text-parchment/60 font-body-sm text-body-sm">
            <span>Bibliotheca Athenæensis</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted">Registry Node #884</span>
          </div>
        </div>

        {/* Authentication form panel */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center">
          <div className="w-full max-w-xl mx-auto bg-surface-container-lowest p-space-md sm:p-space-xl rounded-xl shadow-md relative">
            <div className="h-1 w-20 bg-brass-accent rounded-full mb-space-md" />

            <div className="mb-space-lg">
              <div className="flex items-center justify-between mb-space-xs gap-2">
                <h1 className="font-headline-lg text-headline-lg text-walnut-dark tracking-tight">Welcome back, Scholar</h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-brass-muted font-label-sm text-label-sm uppercase tracking-wider bg-parchment px-2.5 py-1 rounded">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Secure Port
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Sign in to access your assigned reading carrels, bookmarked manuscripts, and active transcription folios.
              </p>
            </div>

            <div className="space-y-space-sm mb-space-lg">
              <button
                type="button"
                onClick={() => federatedNotice('Institutional Google')}
                className="w-full flex items-center justify-center gap-space-sm py-2.5 px-space-md bg-surface-container-low hover:bg-parchment text-walnut-dark rounded-lg transition-all duration-200 group shadow-sm active:scale-[0.99]"
              >
                <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span className="font-label-lg text-label-lg text-charcoal-text group-hover:text-primary">
                  Continue with Institutional Google Account
                </span>
              </button>
              <button
                type="button"
                onClick={() => federatedNotice('EduGAIN / Shibboleth SSO')}
                className="w-full flex items-center justify-center gap-space-sm py-2.5 px-space-md bg-surface-container-low hover:bg-parchment text-walnut-dark rounded-lg transition-all duration-200 group shadow-sm active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px] text-brass-accent group-hover:text-brass-muted">school</span>
                <span className="font-label-lg text-label-lg text-charcoal-text group-hover:text-primary">
                  Single Sign-On (EduGAIN / Shibboleth SSO)
                </span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-space-lg">
              <div className="w-full h-px bg-surface-container-high" />
              <div className="absolute px-space-md bg-surface-container-lowest flex items-center gap-space-xs text-brass-muted">
                <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant/80">
                  Or catalog credentials
                </span>
                <span className="material-symbols-outlined text-[14px]">auto_stories</span>
              </div>
            </div>

            <form className="space-y-space-md" onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <div className="flex items-start gap-2 bg-error-container/50 ring-1 ring-error/30 rounded-lg p-space-sm" role="alert">
                  <span className="material-symbols-outlined text-[18px] text-error">error</span>
                  <p className="font-body-sm text-body-sm text-on-error-container">{errors.form}</p>
                </div>
              )}

              <div>
                <label className="block font-label-md text-label-md text-walnut-dark mb-1.5" htmlFor="scholar-identity">
                  <span className="flex items-center justify-between">
                    <span>Archival Identity / Scholar Email</span>
                    <span className="text-xs text-brass-muted font-normal">Call number or .edu</span>
                  </span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <input
                    id="scholar-identity"
                    name="identity"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="v.sterling@oxford.athenaeum.edu"
                    aria-invalid={Boolean(errors.email)}
                    className={`w-full pl-10 pr-space-md py-2.5 bg-surface-container-low rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all duration-150 ${
                      errors.email ? 'ring-2 ring-error/60' : 'focus:ring-brass-accent/60'
                    }`}
                  />
                </div>
                {errors.email && <p className="font-body-sm text-body-sm text-error mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-label-md text-label-md text-walnut-dark" htmlFor="scholar-key">
                    Master Repository Key
                  </label>
                  <Link
                    to="/register"
                    className="font-label-sm text-label-sm text-brass-muted hover:text-walnut-dark transition-colors tracking-wide underline decoration-brass-accent/40 underline-offset-2"
                  >
                    Need a key?
                  </Link>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                  </div>
                  <input
                    id="scholar-key"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••••••••••"
                    aria-invalid={Boolean(errors.password)}
                    className={`w-full pl-10 pr-12 py-2.5 bg-surface-container-low rounded-lg text-charcoal-text font-body-md text-body-md placeholder:text-outline-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all duration-150 ${
                      errors.password ? 'ring-2 ring-error/60' : 'focus:ring-brass-accent/60'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-charcoal-text transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {errors.password && <p className="font-body-sm text-body-sm text-error mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded bg-surface-container-low text-walnut-dark accent-primary-container focus:ring-brass-accent/40"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Remember terminal session for 30 days</span>
                </label>
                <span className="text-xs font-label-sm uppercase tracking-wider text-brass-muted bg-surface-container px-2 py-0.5 rounded">
                  Tier IV Clearance
                </span>
              </div>

              <div className="pt-space-sm">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-space-lg bg-primary-container hover:bg-walnut-dark text-parchment font-label-lg text-label-lg rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-space-sm transition-all duration-200 group active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Opening terminal…' : 'Sign In to Folio & Workspace'}</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </form>

            <div className="mt-space-lg pt-space-md bg-surface-container-low p-space-md rounded-lg flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left">
              <div>
                <p className="font-label-md text-label-md text-walnut-dark">New to the Digital Athenaeum?</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Request peer credentials through your affiliated faculty dean.
                </p>
              </div>
              <Link
                to="/register"
                className="shrink-0 px-space-md py-1.5 bg-surface-container-lowest hover:bg-parchment text-walnut-dark font-label-sm text-label-sm uppercase tracking-wider rounded-lg shadow-sm transition-colors duration-150 inline-flex items-center gap-1"
              >
                <span>Apply for Pass</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </Link>
            </div>

            <div className="mt-space-md pt-space-sm flex items-center justify-center gap-space-xs text-center text-outline">
              <span className="material-symbols-outlined text-[15px] text-brass-accent">encrypted</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                Federated academic handshake • Protected under SAML 2.0, TLS 1.3 & W3C Verifiable Credentials
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
