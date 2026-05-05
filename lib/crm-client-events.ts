/** После изменения профиля (имя, аватар, …) — клиенты перечитывают `/api/auth/session`. */
export const CRM_PROFILE_UPDATED_EVENT = "crm-profile-updated";

/** @deprecated используйте CRM_PROFILE_UPDATED_EVENT */
export const CRM_PROFILE_AVATAR_CHANGED_EVENT = CRM_PROFILE_UPDATED_EVENT;

/** Наряд отправлен в архив — канбан сразу перезапрашивает связанные наряды. */
export const CRM_ORDER_ARCHIVED_EVENT = "crm-order-archived";
