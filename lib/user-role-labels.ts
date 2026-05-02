import type { UserRole } from "@prisma/client";

/** Все роли (в т.ч. владелец) — для смены роли в админке. */
export const ALL_USER_ROLES: readonly UserRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "MANAGER",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
  "USER",
];

export function parseUserRole(raw: unknown): UserRole | null {
  if (typeof raw !== "string") return null;
  return (ALL_USER_ROLES as readonly string[]).includes(raw) ? (raw as UserRole) : null;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: "Администратор",
  SENIOR_ADMINISTRATOR: "Старший администратор",
  MANAGER: "Руководитель",
  ACCOUNTANT: "Бухгалтер",
  FINANCIAL_MANAGER: "Финансовый менеджер",
  USER: "Пользователь (только канбан)",
  OWNER: "Владелец",
};

/** Роли, которые можно выдать при приглашении (не владелец). */
export const INVITABLE_ROLES: readonly UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "MANAGER",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
  "USER",
];
