'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useUiDesign } from '@/lib/hooks/useUiDesign'
import { Search } from 'lucide-react'
import { orderPathById } from '@/lib/order-public-ref'

interface SearchResult {
  orders: Array<{
    id: string
    orderNumber: string
    clinicName: string
    doctorName: string
    patientName: string
  }>
  clinics: Array<{ id: string; name: string; address: string }>
  doctors: Array<{ id: string; name: string; clinicName: string }>
}

export function CommandPalette() {
  const isHarmony = useUiDesign() === 'harmony'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&types=orders,clinics,doctors`
        )
        if (res.ok) {
          setResults(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const flatResults = results
    ? [
        ...results.orders.map((o) => ({
          type: 'order' as const,
          id: o.id,
          label: `№ ${o.orderNumber}`,
          sub: [o.clinicName, o.doctorName, o.patientName].filter(Boolean).join(' · '),
          href: orderPathById(o.id),
        })),
        ...results.clinics.map((c) => ({
          type: 'clinic' as const,
          id: c.id,
          label: c.name,
          sub: c.address,
          href: `/clients/${c.id}`,
        })),
        ...results.doctors.map((d) => ({
          type: 'doctor' as const,
          id: d.id,
          label: d.name,
          sub: d.clinicName,
          href: `/clients/doctors/${d.id}`,
        })),
      ]
    : []

  const typeIcons = { order: '📋', clinic: '🏥', doctor: '👨‍⚕️' }

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href)
      setOpen(false)
      setQuery('')
      setResults(null)
    },
    [router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      setResults(null)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && flatResults[selectedIndex]) {
      handleSelect(flatResults[selectedIndex].href)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          isHarmony
            ? 'input-elegant flex h-auto w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-muted)] hover:border-[var(--text-muted)]'
            : `inline-flex h-8 w-full items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]`
        }
        aria-label="Поиск"
      >
        {isHarmony ? (
          <Search className="h-[18px] w-[18px] shrink-0" aria-hidden />
        ) : (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5l2.5 2.5" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <span className="flex-1 text-left text-xs sm:text-sm">Поиск...</span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[10vh]">

            <motion.div
              className="absolute inset-0 bg-zinc-900/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              className="relative z-10 w-full max-w-lg mx-4
                         rounded-2xl border border-[var(--card-border)]
                         bg-[var(--card-bg)] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="dialog"
              aria-label="Поиск"
            >
              <div className="flex items-center gap-3 px-4 py-3
                              border-b border-[var(--card-border)]">
                <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                     viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5"
                          stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5l2.5 2.5"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Поиск заказов, клиник, врачей..."
                  className="flex-1 bg-transparent text-sm text-[var(--app-text)]
                             placeholder:text-[var(--text-muted)] outline-none"
                  aria-label="Поиск"
                  autoComplete="off"
                />
                {loading && (
                  <svg className="h-4 w-4 animate-spin text-[var(--text-muted)]"
                       viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-2">
                {query.length < 2 && (
                  <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    Введите минимум 2 символа для поиска
                  </p>
                )}

                {query.length >= 2 && !loading && flatResults.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    Ничего не найдено по запросу «{query}»
                  </p>
                )}

                {flatResults.length > 0 && (
                  <ul role="listbox">
                    {flatResults.map((item, index) => (
                      <li key={`${item.type}-${item.id}`} role="presentation">
                        <button
                          type="button"
                          onClick={() => handleSelect(item.href)}
                          aria-selected={index === selectedIndex}
                          className={[
                            'w-full flex items-center gap-3 px-4 py-2.5',
                            'text-left transition-colors',
                            index === selectedIndex
                              ? 'bg-[var(--surface-hover)]'
                              : 'hover:bg-[var(--surface-subtle)]',
                          ].join(' ')}
                        >
                          <span className="text-base shrink-0" aria-hidden="true">
                            {typeIcons[item.type]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text-strong)] truncate">
                              {item.label}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate">
                              {item.sub}
                            </div>
                          </div>
                          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                               viewBox="0 0 16 16" fill="none">
                            <path d="M6 3l5 5-5 5"
                                  stroke="currentColor" strokeWidth="1.5"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
