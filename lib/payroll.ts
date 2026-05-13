import type { PayrollWorkKind, UserRole } from "@prisma/client";

export const PAYROLL_WORK_KIND_VALUES = [
  "CAD",
  "CAD_SURGERY",
  "MANUAL",
  "PROCESSING",
] as const satisfies readonly PayrollWorkKind[];

export type PayrollWorkKindValue = (typeof PAYROLL_WORK_KIND_VALUES)[number];

export const PAYROLL_WORK_KIND_LABELS: Record<PayrollWorkKindValue, string> = {
  CAD: "CAD",
  CAD_SURGERY: "CAD Хирургия",
  MANUAL: "Мануал",
  PROCESSING: "Обработка",
};

export function isPayrollUserRole(role: UserRole | null | undefined): boolean {
  return role === "USER" || role === "SENIOR_TECHNICIAN" || role === "OWNER";
}

export function canReviewPayroll(role: UserRole | null | undefined): boolean {
  return role === "SENIOR_TECHNICIAN" || role === "OWNER";
}

export function canConfigurePayroll(role: UserRole | null | undefined): boolean {
  return role === "OWNER";
}

export function parsePayrollWorkKind(value: unknown): PayrollWorkKindValue | null {
  if (typeof value !== "string") return null;
  return (PAYROLL_WORK_KIND_VALUES as readonly string[]).includes(value)
    ? (value as PayrollWorkKindValue)
    : null;
}

export function normalizePayrollAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value).replace(/\s/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function normalizePayrollQuantity(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").replace(/\s/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(999, Math.max(1, Math.trunc(n)));
}
