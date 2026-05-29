interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({
  orientation = 'horizontal',
  className = '',
}: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={[
        orientation === 'horizontal'
          ? 'h-px w-full bg-[var(--card-border)]'
          : 'w-px self-stretch bg-[var(--card-border)]',
        className,
      ].join(' ')}
    />
  )
}
