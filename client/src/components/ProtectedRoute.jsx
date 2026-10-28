import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FullPageNote({ icon, title, body, action }) {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl text-center max-w-xl mx-auto">
        <span className="material-symbols-outlined text-[40px] text-brass-muted">{icon}</span>
        <h1 className="font-headline-md text-headline-md text-walnut-dark mt-space-sm">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">{body}</p>
        {action}
      </div>
    </div>
  )
}

/**
 * Client-side route guard. This only improves the experience — every protected
 * API route independently re-checks the session and role on the server.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-space-xl">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-brass-accent animate-pulse" />
          <span className="font-label-md text-label-md">Verifying archival credentials…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <FullPageNote
        icon="lock"
        title="Curator privileges required"
        body="This area of the archive is restricted to librarians and archivists. Sign in with a staff account to continue."
      />
    )
  }

  return children
}
