import type { AppModule } from "@prisma/client";

/** Ссылка «Конфигурация» в боковом меню: хотя бы один шаг в каталог. */
export function hasDirectorySidebarAccess(
  a: Record<AppModule, boolean> | null | undefined,
): boolean {
  if (!a) return true;
  return (
    a.DIRECTORY === true ||
    a.CONFIG_PRICING === true ||
    a.CONFIG_WAREHOUSE === true ||
    a.CONFIG_KANBAN_BOARDS === true ||
    a.CONFIG_KANBAN_PRODUCTION === true ||
    a.CONFIG_KANBAN_CARD_TYPES === true ||
    a.CONFIG_KAITEN === true ||
    a.CONFIG_COURIERS === true ||
    a.CONFIG_ORDERS_IMPORT_EXPORT === true ||
    a.CONFIG_CONTRACT_TEMPLATE === true ||
    a.CONFIG_COSTING === true ||
    a.MAIL === true ||
    a.CONFIG_USERS === true ||
    a.CONFIG_PRINT === true ||
    a.CONFIG_APPEARANCE === true
  );
}

/** Хаб /directory: хотя бы одна плитка конфигурации доступна роли. */
export function hasDirectoryHubAccess(
  a: Record<AppModule, boolean> | null | undefined,
): boolean {
  return hasDirectorySidebarAccess(a);
}
