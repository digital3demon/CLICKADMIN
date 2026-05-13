import type { UserRole } from "@prisma/client";

export const VIEW_AS_ROLE_COOKIE_NAME = "crm_view_as_role";

const VIEW_AS_ROLES = new Set<UserRole>([
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "SENIOR_TECHNICIAN",
  "PRODUCTION",
  "SENIOR_PRODUCTION",
  "MANAGER",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
  "USER",
]);

export function parseViewAsRole(value: string | null | undefined): UserRole | null {
  const role = (value ?? "").trim() as UserRole;
  return VIEW_AS_ROLES.has(role) ? role : null;
}
