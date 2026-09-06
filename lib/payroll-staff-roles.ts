/**
 * Tenant-роли сотрудников ФОТ: фильтр видимости, поиск, сиды имён.
 * Общий ФОТ = нет связей PayrollConfigStaffRole.
 */
import type { UserRole } from "@prisma/client";

export const DEFAULT_PAYROLL_STAFF_ROLE_SEEDS = [
  { name: "Цифра", sortOrder: 10, legacyTrack: "DIGITAL" as const },
  { name: "Мануал", sortOrder: 20, legacyTrack: "MANUAL" as const },
  { name: "Цифра+Мануал", sortOrder: 30, legacyTrack: "DIGITAL_MANUAL" as const },
  { name: "Производство", sortOrder: 40, legacyTrack: "SHOP_FLOOR" as const },
] as const;

export function payrollStaffRoleRequiredForRole(role: UserRole): boolean {
  return role === "USER";
}

export function shouldFilterPayrollOptionsByStaffRole(role: UserRole): boolean {
  return role === "USER";
}

/** Конфиг виден: общие (0 ролей) или пересечение с ролью пользователя. */
export function isPayrollConfigVisibleForStaffRole(
  configStaffRoleIds: readonly string[],
  userStaffRoleId: string | null | undefined,
): boolean {
  if (configStaffRoleIds.length === 0) return true;
  if (!userStaffRoleId) return false;
  return configStaffRoleIds.includes(userStaffRoleId);
}

export type PayrollConfigSearchable = {
  name: string;
  amountRub: number;
  priceItems?: readonly { code: string; name: string }[];
};

export function payrollConfigMatchesQuery(
  row: PayrollConfigSearchable,
  query: string,
): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  if (row.name.toLowerCase().includes(q)) return true;
  if (String(row.amountRub).includes(q.replace(/\s/g, ""))) return true;
  for (const p of row.priceItems ?? []) {
    if (p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) {
      return true;
    }
  }
  return false;
}

export function configMatchesOrderPriceItems(
  linkedPriceItemIds: readonly string[],
  orderPriceItemIds: ReadonlySet<string>,
): boolean {
  if (linkedPriceItemIds.length === 0 || orderPriceItemIds.size === 0) return false;
  return linkedPriceItemIds.some((id) => orderPriceItemIds.has(id));
}
