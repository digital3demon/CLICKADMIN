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
    a.CONFIG_USERS === true
  );
}
