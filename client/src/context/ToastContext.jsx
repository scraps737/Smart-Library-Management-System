import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TONES = {
  success: { icon: 'check_circle', ring: 'ring-brass-accent/40', iconClass: 'text-brass-muted' },
  error: { icon: 'error', ring: 'ring-error/40', iconClass: 'text-error' },
  info: { icon: 'info', ring: 'ring-outline/30', iconClass: 'text-outline' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone, message) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, tone, message }])
      setTimeout(() => dismiss(id), 4600)
      return id
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      push,
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-24 right-4 sm:right-6 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-toast-in bg-surface-container-lowest shadow-lg ring-1 ${tone.ring} rounded-xl px-space-md py-space-sm flex items-start gap-space-sm`}
            >
              <span className={`material-symbols-outlined text-[20px] ${tone.iconClass}`}>{tone.icon}</span>
              <p className="font-body-sm text-body-sm text-charcoal-text flex-1 leading-relaxed">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="text-outline hover:text-walnut-dark transition-colors"
                onClick={() => dismiss(t.id)}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider')
  return ctx
}
