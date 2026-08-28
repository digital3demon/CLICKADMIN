/** После изменения профиля (имя, аватар, …) — клиенты перечитывают `/api/auth/session`. */
export const CRM_PROFILE_UPDATED_EVENT = "crm-profile-updated";

/** @deprecated используйте CRM_PROFILE_UPDATED_EVENT */
export const CRM_PROFILE_AVATAR_CHANGED_EVENT = CRM_PROFILE_UPDATED_EVENT;

/** Наряд отправлен в архив — канбан сразу перезапрашивает связанные наряды. */
export const CRM_ORDER_ARCHIVED_EVENT = "crm-order-archived";

/** Колонка наряда сменилась («Работа отправлена» / снятие) — канбан тянет плитки. */
export const CRM_ORDER_KANBAN_COLUMN_EVENT = "crm-order-kanban-column";

export function dispatchCrmOrderKanbanColumnChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CRM_ORDER_KANBAN_COLUMN_EVENT));
}

/** Очередь «Мессенджеры» изменилась — сайдбар пересчитывает непрочитанные. */
export const CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT =
  "crm-messenger-open-count-changed";
