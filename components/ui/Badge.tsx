export type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gray:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

export function Badge({
  variant = 'default',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        'text-xs font-medium leading-none',
        badgeVariants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
