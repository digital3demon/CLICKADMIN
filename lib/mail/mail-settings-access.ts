import type { AppModule, PrismaClient, UserRole } from "@prisma/client";
import { canAccessMailSettingsConfig } from "@/lib/auth/permissions";
import { hasMailSettingsPageAccess } from "@/lib/mail/mail-service";

/**
 * Доступ к «Конфигурация → Почта»:
 * — владелец или галочка «Конфиг: почта» в матрице;
 * — либо роль отмечена в «Настройки почты» хотя бы у одного ящика.
 */
export async function canOpenMailSettingsModule(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): Promise<boolean> {
  if (canAccessMailSettingsConfig(role, moduleAccess)) return true;
  return hasMailSettingsPageAccess(db, tenantId, userId, role);
}
