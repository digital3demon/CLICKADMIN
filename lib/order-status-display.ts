import type { BadgeVariant } from '@/components/ui/Badge'

interface StatusDisplay {
  variant: BadgeVariant
  label?: string
}

// Маппинг заголовков колонок Kaiten → цвет бейджа
// Ключи — точные строки из kaitenColumnTitle
// Дополняй по мере появления новых статусов в Kaiten
export const KAITEN_COLUMN_DISPLAY: Record<string, StatusDisplay> = {
  'Новые':             { variant: 'blue' },
  'В работе':          { variant: 'yellow' },
  'Готово':            { variant: 'green' },
  'Отправлено':        { variant: 'purple' },
  'Корректировка':     { variant: 'red' },
  'Стоп':              { variant: 'red' },
  'Ожидание':          { variant: 'gray' },
}

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

export function getKaitenColumnDisplay(
  columnTitle: string | null | undefined
): StatusDisplay {
  if (!columnTitle) return { variant: 'default' }
  return KAITEN_COLUMN_DISPLAY[columnTitle] ?? { variant: 'default' }
}

export function getKaitenColumnDisplayFromOrder(opts: {
  kaitenColumnTitle?: string | null
  demoKanbanColumn?: string | null
}): StatusDisplay {
  return getKaitenColumnDisplay(resolveKaitenColumnTitleForDisplay(opts))
}

// Индикаторы проблем в строке заказа
export interface OrderIndicators {
  hasCorrection: boolean    // !!! в чате Kaiten
  hasProsthetics: boolean   // ??? в чате Kaiten
  isOverdue: boolean        // срок лаборатории прошёл
  hasUnreadChat: boolean    // непрочитанный чат
  hasMention: boolean       // @упоминание лаборатории
}

export function getOrderWarnings(
  indicators: Partial<OrderIndicators>
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
