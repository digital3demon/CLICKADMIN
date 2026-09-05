/**
 * Стартовая колонка CRM-канбана при создании наряда.
 * Timezone не участвует: в БД пишем заголовок столбца как на доске.
 */
import {
  isKanbanStopColumnTitle,
  KANBAN_STOP_COLUMN_TITLE,
} from "@/lib/kanban/kanban-stop-column";

/** Совпадает с KAITEN_MIRROR_DEFAULT_QUEUE_TITLE — без импорта тяжёлого model. */
export const CRM_DEFAULT_KANBAN_COLUMN_TITLE = "К исполнению";

/**
 * Пусто → очередь.
 * СТОП из формы нового заказа — канон «СТОП» (в конфиге по умолчанию СТОП не ставим).
 * Иначе заголовок столбца как ввёл пользователь.
 */
export function resolveCreateOrderKanbanColumnTitle(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t) return CRM_DEFAULT_KANBAN_COLUMN_TITLE;
  if (isKanbanStopColumnTitle(t)) return KANBAN_STOP_COLUMN_TITLE;
  return t;
}
