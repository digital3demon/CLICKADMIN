import type { UserRole } from "@prisma/client";

/** Настройка «Мессенджер для админов» на уровне организации. */
export function canConfigureTenantAdminMessenger(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "SENIOR_ADMINISTRATOR"
  );
}
