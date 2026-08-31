/**
 * Настройки уведомлений в Telegram о событиях канбана CRM (профиль пользователя).
 * Сервер и модалка карточки шлют в бота CRM и для карточек с kaitenCardId
 * (Kaiten свой бот не подменяет эти галочки).
 */

/** События рассылки (тело POST /api/kanban/telegram-notify). */
export const KANBAN_TELEGRAM_EVENT_KEYS = [
  "tg_person_added_to_card",
  "tg_person_assigned_responsible",
  "tg_person_removed_from_card",
  "tg_mentioned_in_comment",
  "tg_checklist_assigned_responsible",
  "tg_deadline_reminder",
  "tg_kanban_crm_sync",
  "tg_block_added",
  "tg_card_unblocked",
  "tg_comment_added",
  "tg_description_changed",
  "tg_due_changed",
  "tg_order_correction_changed",
  "tg_order_prosthetics_changed",
  "tg_production_new_card",
  "tg_production_mentioned",
] as const;

export const KANBAN_TELEGRAM_PREF_KEYS = [
  ...KANBAN_TELEGRAM_EVENT_KEYS,
  "tg_notify_own_actions",
] as const;

export type KanbanTelegramPrefKey = (typeof KANBAN_TELEGRAM_PREF_KEYS)[number];

export type KanbanTelegramPrefsMap = Partial<Record<KanbanTelegramPrefKey, boolean>>;

/** Свои действия — opt-in; остальные типы по умолчанию включены. */
const DEFAULT_OFF_PREF_KEYS = new Set<KanbanTelegramPrefKey>([
  "tg_notify_own_actions",
]);

const DEFAULT_PREFS = Object.fromEntries(
  KANBAN_TELEGRAM_PREF_KEYS.map((k) => [k, !DEFAULT_OFF_PREF_KEYS.has(k)]),
) as Record<KanbanTelegramPrefKey, boolean>;

export const KANBAN_TELEGRAM_PREF_SECTIONS: Array<{
  id: string;
  title: string;
  keys: KanbanTelegramPrefKey[];
}> = [
  {
    id: "own",
    title: "Свои действия",
    keys: ["tg_notify_own_actions"],
  },
  {
    id: "personal",
    title: "Персональные события",
    keys: [
      "tg_person_added_to_card",
      "tg_person_assigned_responsible",
      "tg_person_removed_from_card",
      "tg_mentioned_in_comment",
      "tg_checklist_assigned_responsible",
    ],
  },
  {
    id: "deadline",
    title: "Напоминание о сроке",
    keys: ["tg_deadline_reminder"],
  },
  {
    id: "card",
    title: "Карточка",
    keys: [
      "tg_kanban_crm_sync",
      "tg_block_added",
      "tg_card_unblocked",
      "tg_comment_added",
      "tg_description_changed",
      "tg_due_changed",
    ],
  },
  {
    id: "order",
    title: "Наряд в CRM",
    keys: ["tg_order_correction_changed", "tg_order_prosthetics_changed"],
  },
];

export const KANBAN_TELEGRAM_PREF_LABELS: Record<KanbanTelegramPrefKey, string> = {
  tg_notify_own_actions: "Уведомлять о моих действиях",
  tg_person_added_to_card: "Вас добавили в карточку",
  tg_person_assigned_responsible: "Вас назначили ответственным в карточке",
  tg_person_removed_from_card: "Вы были исключены из карточки",
  tg_mentioned_in_comment: "Вас упомянули в комментарии",
  tg_checklist_assigned_responsible:
    "Вас назначили ответственным в пункте чек-листа",
  tg_deadline_reminder: "Напоминание о сроке",
  tg_kanban_crm_sync: "Изменения с канбана CRM (колонка / тип карточки)",
  tg_block_added: "Добавлена блокировка",
  tg_card_unblocked: "Карточка разблокирована",
  tg_comment_added: "Добавлен комментарий",
  tg_description_changed: "Изменилось описание",
  tg_due_changed: "Изменился срок выполнения",
  tg_order_correction_changed:
    "Статус корректировки (подтвердили, отказ, вопрос)",
  tg_order_prosthetics_changed:
    "Статус протетики (принят, отклонён, в пути, на базе)",
  tg_production_new_card:
    "Новая карточка на доске Производство (дорожка в тексте)",
  tg_production_mentioned:
    "Упоминание группы производства (@тег из настроек доски)",
};

export const KANBAN_TELEGRAM_PREF_HINTS: Partial<
  Record<KanbanTelegramPrefKey, string>
> = {
  tg_notify_own_actions:
    "Если включено — бот напишет и вам: добавили или исключили себя, поставили срок, перенесли карточку.",
};

/** Только для роли «Производство» — переключатели в профиле. */
export const KANBAN_TELEGRAM_PREF_SECTIONS_PRODUCTION: Array<{
  id: string;
  title: string;
  keys: KanbanTelegramPrefKey[];
}> = [
  {
    id: "production",
    title: "Производство (канбан CRM)",
    keys: ["tg_production_new_card", "tg_production_mentioned"],
  },
];

function isPrefKey(k: string): k is KanbanTelegramPrefKey {
  return (KANBAN_TELEGRAM_PREF_KEYS as readonly string[]).includes(k);
}

function isEventKey(k: string): k is KanbanTelegramPrefKey {
  return (KANBAN_TELEGRAM_EVENT_KEYS as readonly string[]).includes(k);
}

/** Разбор тела POST для серверных хуков канбана (только события, не галочки-фильтры). */
export function parseKanbanTelegramPrefKey(
  raw: unknown,
): KanbanTelegramPrefKey | null {
  if (typeof raw !== "string" || !isEventKey(raw)) return null;
  return raw;
}

/** Слить сохранённые prefs: события включены, «мои действия» выключены. */
export function mergeKanbanTelegramPrefs(
  stored: unknown,
): Record<KanbanTelegramPrefKey, boolean> {
  const out = { ...DEFAULT_PREFS } as Record<KanbanTelegramPrefKey, boolean>;
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) {
    return out;
  }
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    if (!isPrefKey(k)) continue;
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

/** Проверка тела PATCH профиля: только известные ключи и boolean. */
export function parseKanbanTelegramPrefsPatch(
  raw: unknown,
): KanbanTelegramPrefsMap | null {
  if (raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: KanbanTelegramPrefsMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isPrefKey(k)) return null;
    if (typeof v !== "boolean") return null;
    out[k] = v;
  }
  return out;
}

export function isKanbanTelegramPrefEnabled(
  merged: Record<KanbanTelegramPrefKey, boolean>,
  key: KanbanTelegramPrefKey,
): boolean {
  return merged[key] === true;
}

export function shouldNotifyKanbanOwnActions(
  merged: Record<KanbanTelegramPrefKey, boolean>,
): boolean {
  return isKanbanTelegramPrefEnabled(merged, "tg_notify_own_actions");
}
