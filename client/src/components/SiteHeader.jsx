import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PILL_BASE = 'px-space-md py-space-sm transition-colors rounded-lg'
const PILL_ACTIVE = `${PILL_BASE} bg-primary-container text-on-primary font-semibold shadow-sm`
const PILL_IDLE = `${PILL_BASE} font-label-md text-label-md text-on-surface-variant hover:text-on-surface`

function navItems(isAuthenticated, isStaff) {
  const items = [{ to: '/catalog', label: 'Catalog' }]
  if (isStaff) {
    items.push(
      { to: '/inventory', label: 'Inventory' },
      { to: '/admin/analytics', label: 'Analytics' }
    )
  }
  items.push({ to: '/categories', label: 'Disciplines' }, { to: '/circulation', label: 'Circulation' })
  if (isAuthenticated) items.push({ to: '/profile', label: 'Profile' })
  return items
}

export default function SiteHeader() {
  const { user, isAuthenticated, isStaff, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close transient menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
    setAccountOpen(false)
  }, [location.pathname, location.search])

  const items = navItems(isAuthenticated, isStaff)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(62,39,35,0.05)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin flex items-center justify-between gap-space-md">
        <Link to="/" className="flex items-center gap-space-md shrink-0" aria-label="Athenaeum home">
          <img alt="Athenaeum Library emblem" className="h-8 w-auto object-contain" src="/assets/athenaeum-mark.svg" />
          <span className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-walnut-dark tracking-tight leading-none">Athenaeum</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted mt-0.5">
              Digital Library • Curated Archive
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-space-xs p-1 rounded-xl bg-parchment/60">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? PILL_ACTIVE : PILL_IDLE)}
            >
              {item.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? PILL_ACTIVE : PILL_IDLE)}>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? PILL_ACTIVE : PILL_IDLE)}>
                Sign Up
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-space-sm sm:gap-space-md">
          <Link
            to="/catalog"
            aria-label="Search the archive"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-parchment hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </Link>

          <Link
            to={isAuthenticated ? '/profile#saved-titles' : '/login'}
            aria-label="Saved titles"
            className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-on-surface-variant hover:bg-parchment hover:text-on-surface transition-colors relative"
          >
            <span className="material-symbols-outlined text-[20px]">bookmark</span>
            {user?.bookmarkCount > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brass-accent" />}
          </Link>

          <div className="hidden sm:block h-5 w-[1px] bg-border-subtle" />

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-space-sm rounded-lg hover:bg-parchment/70 px-1.5 py-1 transition-colors"
              >
                <span className="relative flex items-center justify-center">
                  <img
                    alt={`${user.fullName} avatar`}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-parchment"
                    src={user.avatarUrl || '/assets/scholar-portrait.png'}
                    onError={(e) => {
                      e.currentTarget.src = '/assets/scholar-portrait.png'
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-cream-surface" />
                </span>
                <span className="hidden xl:flex flex-col items-start">
                  <span className="font-label-md text-label-md text-walnut-dark leading-tight">{user.fullName}</span>
                  <span className="font-label-sm text-label-sm text-brass-muted">{user.membershipTier}</span>
                </span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-lg ring-1 ring-border-subtle p-space-sm flex flex-col"
                >
                  <div className="px-space-sm py-space-xs border-b border-border-subtle mb-space-xs">
                    <p className="font-label-md text-label-md text-walnut-dark">{user.fullName}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</p>
                    <p className="font-label-sm text-label-sm uppercase tracking-wider text-brass-muted mt-1">
                      {user.role} • {user.membershipTier}
                    </p>
                  </div>
                  <Link to="/profile" className="flex items-center gap-2 px-space-sm py-2 rounded-lg hover:bg-parchment transition-colors font-body-md text-body-md text-charcoal-text">
                    <span className="material-symbols-outlined text-[18px] text-brass-muted">badge</span> Scholar profile
                  </Link>
                  <Link to="/circulation" className="flex items-center gap-2 px-space-sm py-2 rounded-lg hover:bg-parchment transition-colors font-body-md text-body-md text-charcoal-text">
                    <span className="material-symbols-outlined text-[18px] text-brass-muted">swap_horiz</span> My circulation
                  </Link>
                  {isStaff && (
                    <Link to="/inventory" className="flex items-center gap-2 px-space-sm py-2 rounded-lg hover:bg-parchment transition-colors font-body-md text-body-md text-charcoal-text">
                      <span className="material-symbols-outlined text-[18px] text-brass-muted">inventory_2</span> Inventory desk
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-space-sm py-2 rounded-lg hover:bg-parchment transition-colors font-body-md text-body-md text-error text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-parchment hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t border-border-subtle bg-cream-surface px-margin py-space-md flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-semibold'
                  : 'px-space-md py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-parchment transition-colors'
              }
            >
              {item.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <>
              <NavLink to="/login" className="px-space-md py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-parchment transition-colors">
                Login
              </NavLink>
              <NavLink to="/register" className="px-space-md py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-parchment transition-colors">
                Sign Up
              </NavLink>
            </>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-left px-space-md py-2.5 rounded-lg font-label-md text-label-md text-error hover:bg-parchment transition-colors"
            >
              Sign out
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
