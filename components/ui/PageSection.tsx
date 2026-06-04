'use client'

import type { ReactNode } from 'react'
import { useUiDesign } from '@/lib/hooks/useUiDesign'

type PageSectionProps = {
  children: ReactNode
  className?: string
  sticky?: boolean
}

/** Карточка секции в стиле harmony; в classic — без лишней оболочки. */
export function PageSection({
  children,
  className = '',
  sticky = false,
}: PageSectionProps) {
  const isHarmony = useUiDesign() === 'harmony'

  if (!isHarmony) {
    return <div className={className}>{children}</div>
  }

  return (
    <section
      className={[
        'rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] card-shadow',
        sticky ? 'sticky top-0 z-30 sticky-shadow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  )
}
