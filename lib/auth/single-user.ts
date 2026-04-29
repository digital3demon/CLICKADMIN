import type { SessionClaims } from "@/lib/auth/jwt";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

/**
 * Переносимая однопользовательская сборка: без входа, без ролей и приглашений.
 *
 * Для портативного ZIP флаг задаётся при `npm run package:windows`
 * (переменная NEXT_PUBLIC_CRM_SINGLE_USER=1 на время `next build`, чтобы Edge
 * middleware получил константу).
 *
 * Для локальной проверки: `set NEXT_PUBLIC_CRM_SINGLE_USER=1` (Windows) и `npm run dev`.
 */
export function isSingleUserPortable(): boolean {
  const v =
    process.env.NEXT_PUBLIC_CRM_SINGLE_USER ?? process.env.CRM_SINGLE_USER;
  return v === "1" || v === "true";
}

/** Синтетическая сессия: полный доступ, в т.ч. аналитика. */
export const SINGLE_USER_SESSION: SessionClaims = {
  sub: "portable-single-user",
  email: "local@localhost",
  role: "OWNER",
  name: "Пользователь",
  tid: DEFAULT_TENANT_ID,
  plan: "ULTRA",
  addonKanban: true,
};
