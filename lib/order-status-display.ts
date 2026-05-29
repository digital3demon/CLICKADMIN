import type { BadgeVariant } from '@/components/ui/Badge'
import { normalizeKanbanColumnTitle } from '@/lib/kaiten-column-title'
import {
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  LAB_WORK_STATUS_PILL_STYLES,
  type LabWorkStatus,
} from '@/lib/lab-work-status'

interface StatusDisplay {
  variant: BadgeVariant
  label?: string
}

const LAB_STATUS_BADGE_VARIANT: Record<LabWorkStatus, BadgeVariant> = {
  TO_SCAN: 'gray',
  TO_EXECUTION: 'blue',
  APPROVAL: 'purple',
  PRODUCTION: 'yellow',
  ASSEMBLY: 'green',
  PROCESSING: 'blue',
  MANUAL: 'purple',
  TO_REVIEW: 'purple',
  TO_ADMINS: 'yellow',
}

/** Колонки воронки лаборатории (как в Kaiten / CRM-канбане) → цвет. */
const KAITEN_COLUMN_DISPLAY: Record<string, StatusDisplay> = (() => {
  const map: Record<string, StatusDisplay> = {
    Новые: { variant: 'blue' },
    'В работе': { variant: 'yellow' },
    Готово: { variant: 'green' },
    Отправлено: { variant: 'purple' },
    Корректировка: { variant: 'red' },
    Стоп: { variant: 'red' },
    Ожидание: { variant: 'gray' },
  }
  for (const status of LAB_WORK_STATUS_ORDER) {
    map[LAB_WORK_STATUS_LABELS[status]] = {
      variant: LAB_STATUS_BADGE_VARIANT[status],
    }
  }
  return map
})()

/** Демо-канбан: enum → подпись колонки (как в kaitenStatusDisplay). */
const DEMO_KANBAN_COL_RU: Record<string, string> = {
  NEW: 'Новые',
  IN_PROGRESS: 'В работе',
  DONE: 'Готово',
}

export function resolveKaitenColumnTitleForDisplay(opts: {
  kaitenColumnTitle?: string | null
  demoKanbanColumn?: string | null
}): string | null {
  const trimmed = opts.kaitenColumnTitle?.trim()
  if (trimmed) return trimmed
  const demo = opts.demoKanbanColumn?.trim()
  if (!demo) return null
  return DEMO_KANBAN_COL_RU[demo] ?? demo
}

function resolveLabWorkStatusForColumnTitle(
  columnTitle: string | null | undefined,
): LabWorkStatus | null {
  const norm = normalizeKanbanColumnTitle(columnTitle ?? '')
  if (!norm) return null

  for (const status of LAB_WORK_STATUS_ORDER) {
    const labelNorm = normalizeKanbanColumnTitle(LAB_WORK_STATUS_LABELS[status])
    if (norm === labelNorm) return status
  }

  for (const status of LAB_WORK_STATUS_ORDER) {
    const labelNorm = normalizeKanbanColumnTitle(LAB_WORK_STATUS_LABELS[status])
    if (
      labelNorm.length >= 4 &&
      norm.length >= 4 &&
      (norm.includes(labelNorm) || labelNorm.includes(norm))
    ) {
      return status
    }
  }

  return null
}

export function getKaitenColumnPillClassName(
  columnTitle: string | null | undefined,
): string {
  const status = resolveLabWorkStatusForColumnTitle(columnTitle)
  if (status) return LAB_WORK_STATUS_PILL_STYLES[status]
  return LAB_WORK_STATUS_PILL_STYLES.TO_EXECUTION
}

export function getKaitenColumnPillClassFromOrder(opts: {
  kaitenColumnTitle?: string | null
  demoKanbanColumn?: string | null
}): string {
  return getKaitenColumnPillClassName(resolveKaitenColumnTitleForDisplay(opts))
}

export function getKaitenColumnDisplay(
  columnTitle: string | null | undefined,
): StatusDisplay {
  if (!columnTitle?.trim()) return { variant: 'default' }

  const exact = KAITEN_COLUMN_DISPLAY[columnTitle.trim()]
  if (exact) return exact

  const status = resolveLabWorkStatusForColumnTitle(columnTitle)
  if (status) return { variant: LAB_STATUS_BADGE_VARIANT[status] }

  const norm = normalizeKanbanColumnTitle(columnTitle)
  for (const [key, value] of Object.entries(KAITEN_COLUMN_DISPLAY)) {
    if (normalizeKanbanColumnTitle(key) === norm) return value
  }

  return { variant: 'blue' }
}

export function getKaitenColumnDisplayFromOrder(opts: {
  kaitenColumnTitle?: string | null
  demoKanbanColumn?: string | null
}): StatusDisplay {
  return getKaitenColumnDisplay(resolveKaitenColumnTitleForDisplay(opts))
}

// Индикаторы проблем в строке заказа
export interface OrderIndicators {
  hasCorrection: boolean
  hasProsthetics: boolean
  isOverdue: boolean
  hasUnreadChat: boolean
  hasMention: boolean
}

export function getOrderWarnings(
  indicators: Partial<OrderIndicators>,
): Array<{ icon: string; label: string; variant: BadgeVariant }> {
  const warnings = []

  if (indicators.isOverdue) {
    warnings.push({ icon: '⚠️', label: 'Просрочен', variant: 'red' as const })
  }
  if (indicators.hasCorrection) {
    warnings.push({ icon: '✏️', label: 'Корректировка', variant: 'yellow' as const })
  }
  if (indicators.hasProsthetics) {
    warnings.push({ icon: '🦷', label: 'Протетика', variant: 'blue' as const })
  }
  if (indicators.hasMention) {
    warnings.push({ icon: '💬', label: 'Упоминание', variant: 'purple' as const })
  }

  return warnings
}
