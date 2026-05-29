'use client'

interface FilterBadgeProps {
  count: number
  onReset: () => void
  label?: string
}

export function FilterBadge({
  count,
  onReset,
  label = 'Фильтры',
}: FilterBadgeProps) {
  if (count === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg
                         text-xs font-medium text-[var(--text-secondary)]
                         border border-[var(--card-border)] bg-[var(--card-bg)]"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {label}
      </span>
    )
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--sidebar-blue)]
                    overflow-hidden">
      <span className="inline-flex items-center gap-1.5 h-7 px-2.5
                       text-xs font-medium text-[var(--sidebar-blue)]
                       bg-blue-50 dark:bg-blue-900/20">
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {label}
        <span className="inline-flex items-center justify-center
                         h-4 min-w-4 px-1 rounded-full
                         bg-[var(--sidebar-blue)] text-white text-[10px] font-bold">
          {count}
        </span>
      </span>
      <button
        type="button"
        onClick={onReset}
        title="Сбросить все фильтры"
        className="h-7 px-1.5 text-[var(--sidebar-blue)]
                   bg-blue-50 dark:bg-blue-900/20
                   hover:bg-blue-100 dark:hover:bg-blue-900/40
                   border-l border-[var(--sidebar-blue)]/30
                   transition-colors"
        aria-label="Сбросить все фильтры"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
