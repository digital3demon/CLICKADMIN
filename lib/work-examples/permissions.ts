import type { UserRole } from "@prisma/client";

const SENIOR_DELETE_ROLES: readonly UserRole[] = [
  "OWNER",
  "MANAGER",
  "SENIOR_TECHNICIAN",
];

/** Целый пример — только старшие. Файлы и ссылку удаляет любой сотрудник с модулем. */
export function canDeleteWorkExampleWhole(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return (SENIOR_DELETE_ROLES as readonly string[]).includes(role);
}
