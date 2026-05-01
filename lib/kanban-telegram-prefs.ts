/**
 * Настройки уведомлений в Telegram о событиях канбана CRM (профиль пользователя).
 * Сервер рассылает при сохранении канбана в наряд и при действиях в модалке карточки без Kaiten;
 * если у карточки есть kaitenCardId, CRM не дублирует события в Telegram.
 */

export const KANBAN_TELEGRAM_PREF_KEYS = [
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
] as const;

export type KanbanTelegramPrefKey = (typeof KANBAN_TELEGRAM_PREF_KEYS)[number];

export type KanbanTelegramPrefsMap = Partial<Record<KanbanTelegramPrefKey, boolean>>;

const DEFAULT_ON = Object.fromEntries(
  KANBAN_TELEGRAM_PREF_KEYS.map((k) => [k, true]),
) as Record<KanbanTelegramPrefKey, boolean>;

export const KANBAN_TELEGRAM_PREF_SECTIONS: Array<{
  id: string;
  title: string;
  keys: KanbanTelegramPrefKey[];
}> = [
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
];

export const KANBAN_TELEGRAM_PREF_LABELS: Record<KanbanTelegramPrefKey, string> = {
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
};

function isPrefKey(k: string): k is KanbanTelegramPrefKey {
  return (KANBAN_TELEGRAM_PREF_KEYS as readonly string[]).includes(k);
}

/** Разбор тела POST для серверных хуков канбана. */
export function parseKanbanTelegramPrefKey(
  raw: unknown,
): KanbanTelegramPrefKey | null {
  if (typeof raw !== "string" || !isPrefKey(raw)) return null;
  return raw;
}

/** Слить сохранённые prefs с дефолтом «всё включено». */
export function mergeKanbanTelegramPrefs(
  stored: unknown,
): Record<KanbanTelegramPrefKey, boolean> {
  const out = { ...DEFAULT_ON } as Record<KanbanTelegramPrefKey, boolean>;
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
