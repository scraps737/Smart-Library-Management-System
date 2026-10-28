import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

export default function Layout() {
  const { pathname } = useLocation()

  // Reset scroll on route change, matching a traditional page load.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <SiteHeader />
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-80px)] flex-1 flex flex-col">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
