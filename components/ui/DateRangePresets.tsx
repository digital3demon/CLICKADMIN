'use client'

interface DateRangePresetsProps {
  onSelect: (from: string, to: string) => void
  currentFrom?: string
  currentTo?: string
}

type PresetKey = 'today' | 'week' | 'month' | 'quarter'

function getPresetRange(preset: PresetKey): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const today = fmt(now)

  switch (preset) {
    case 'today':
      return { from: today, to: today }

    case 'week': {
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: fmt(monday), to: fmt(sunday) }
    }

    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: fmt(first), to: fmt(last) }
    }

    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const first = new Date(now.getFullYear(), q * 3, 1)
      const last = new Date(now.getFullYear(), q * 3 + 3, 0)
      return { from: fmt(first), to: fmt(last) }
    }
  }
}

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today',   label: 'Сегодня' },
  { key: 'week',    label: 'Неделя'  },
  { key: 'month',   label: 'Месяц'   },
  { key: 'quarter', label: 'Квартал' },
]

export function DateRangePresets({
  onSelect,
  currentFrom,
  currentTo,
}: DateRangePresetsProps) {
  return (
    <div className="inline-flex items-center gap-1 p-0.5
                    rounded-lg border border-[var(--card-border)]
                    bg-[var(--card-bg)]">
      {PRESETS.map(({ key, label }) => {
        const range = getPresetRange(key)
        const isActive =
          currentFrom === range.from && currentTo === range.to

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(range.from, range.to)}
            className={[
              'h-6 px-2.5 rounded-md text-xs font-medium transition-colors',
              isActive
                ? 'bg-[var(--sidebar-blue)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
