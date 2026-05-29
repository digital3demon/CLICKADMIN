'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toastStore, type Toast } from './toast-store'

const TYPE_STYLES = {
  success: {
    icon: '✓',
    iconClass: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    barClass: 'bg-green-500',
  },
  error: {
    icon: '✕',
    iconClass: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    barClass: 'bg-red-500',
  },
  warning: {
    icon: '⚠',
    iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
    barClass: 'bg-amber-500',
  },
  info: {
    icon: 'i',
    iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    barClass: 'bg-blue-500',
  },
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return toastStore.subscribe(setToasts)
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2
                 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="sync">
        {toasts.map((toastItem) => {
          const styles = TYPE_STYLES[toastItem.type]
          return (
            <motion.div
              key={toastItem.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto w-full overflow-hidden rounded-xl
                         border border-[var(--card-border)] bg-[var(--card-bg)]
                         shadow-lg shadow-black/10"
            >
              <div className={`h-0.5 w-full ${styles.barClass}`} />

              <div className="flex items-start gap-3 p-3">
                <span
                  className={[
                    'shrink-0 inline-flex items-center justify-center',
                    'h-6 w-6 rounded-full text-xs font-bold',
                    styles.iconClass,
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {styles.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)] leading-snug">
                    {toastItem.message}
                  </p>
                  {toastItem.description ? (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                      {toastItem.description}
                    </p>
                  ) : null}
                  {toastItem.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        toastItem.action!.onClick()
                        toastStore.removeToast(toastItem.id)
                      }}
                      className="mt-1.5 text-xs font-semibold text-[var(--sidebar-blue)]
                                 hover:underline"
                    >
                      {toastItem.action.label}
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => toastStore.removeToast(toastItem.id)}
                  className="shrink-0 text-[var(--text-muted)] hover:text-[var(--app-text)]
                             transition-colors p-0.5 rounded"
                  aria-label="Закрыть уведомление"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
