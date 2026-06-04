'use client'

import { forwardRef } from 'react'
import { useUiDesign } from '@/lib/hooks/useUiDesign'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--sidebar-blue)] text-white',
    'hover:bg-[var(--sidebar-blue-hover)]',
    'disabled:bg-[var(--sidebar-blue)]/50',
    'focus-visible:ring-2 focus-visible:ring-[var(--sidebar-blue)]/50',
  ].join(' '),

  secondary: [
    'border border-[var(--card-border)] bg-[var(--card-bg)]',
    'text-[var(--app-text)]',
    'hover:bg-[var(--surface-hover)]',
    'disabled:opacity-50',
    'focus-visible:ring-2 focus-visible:ring-[var(--input-border)]',
  ].join(' '),

  ghost: [
    'text-[var(--text-secondary)]',
    'hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]',
    'disabled:opacity-50',
    'focus-visible:ring-2 focus-visible:ring-[var(--input-border)]',
  ].join(' '),

  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'disabled:bg-red-600/50',
    'focus-visible:ring-2 focus-visible:ring-red-500/50',
  ].join(' '),

  warning: [
    'bg-amber-500 text-white',
    'hover:bg-amber-600',
    'disabled:bg-amber-500/50',
    'focus-visible:ring-2 focus-visible:ring-amber-400/50',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-xs gap-1 rounded-md',
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const isHarmony = useUiDesign() === 'harmony'
    const harmonyShape =
      isHarmony && (variant === 'primary' || variant === 'secondary')
        ? 'rounded-xl pressable'
        : ''
    const harmonyPrimary =
      isHarmony && variant === 'primary' ? 'uppercase tracking-wide font-bold' : ''

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-colors duration-100 outline-none',
          'focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed',
          'touch-action-manipulation',
          variantClasses[variant],
          isHarmony && size === 'md' ? 'h-9 px-4 text-sm gap-2 rounded-xl' : sizeClasses[size],
          harmonyShape,
          harmonyPrimary,
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : iconLeft ? (
          <span className="shrink-0">{iconLeft}</span>
        ) : null}

        {children && <span className="truncate">{children}</span>}

        {!loading && iconRight && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
