export function LoadingBlock({ label = 'Consulting the archive…', rows = 3 }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col items-center justify-center gap-space-sm">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="w-2 h-2 rounded-full bg-brass-accent animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-brass-accent animate-pulse [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-brass-accent animate-pulse [animation-delay:300ms]" />
      </div>
      <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
      <div className="w-full max-w-md space-y-2 mt-space-sm">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-surface-container animate-pulse" style={{ width: `${100 - i * 18}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="h-56 bg-surface-container animate-pulse" />
          <div className="p-space-md space-y-3">
            <div className="h-3 w-1/3 rounded bg-surface-container animate-pulse" />
            <div className="h-5 w-11/12 rounded bg-surface-container animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-surface-container animate-pulse" />
            <div className="h-8 w-full rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'search_off', title, body, action }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl text-center">
      <span className="material-symbols-outlined text-[40px] text-brass-muted">{icon}</span>
      <h3 className="font-headline-sm text-headline-sm text-walnut-dark mt-space-sm">{title}</h3>
      {body && <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-space-md flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-error-container/40 ring-1 ring-error/30 rounded-xl p-space-lg text-center">
      <span className="material-symbols-outlined text-[36px] text-error">report</span>
      <h3 className="font-headline-sm text-headline-sm text-walnut-dark mt-space-xs">The archive could not be reached</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-space-md px-space-lg py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-walnut-dark transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
