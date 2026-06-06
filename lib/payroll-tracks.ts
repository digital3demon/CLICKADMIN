import type { PayrollUserTrack, UserRole } from "@prisma/client";
import {
  PAYROLL_WORK_KIND_VALUES,
  type PayrollWorkKindValue,
} from "@/lib/payroll";

export const PAYROLL_USER_TRACK_VALUES = [
  "DIGITAL",
  "MANUAL",
  "DIGITAL_MANUAL",
  "SHOP_FLOOR",
] as const satisfies readonly PayrollUserTrack[];

export const PAYROLL_USER_TRACK_LABELS: Record<PayrollUserTrack, string> = {
  DIGITAL: "Цифра",
  MANUAL: "Мануал",
  DIGITAL_MANUAL: "Цифра+Мануал",
  SHOP_FLOOR: "Производство",
};

export type PayrollKindTrackMap = Record<PayrollWorkKindValue, PayrollUserTrack>;

export const PAYROLL_KIND_TRACK_MAP_KEY = "payrollKindTrackMapV1" as const;

/** Категория ФОТ → направление техника по умолчанию. */
export const DEFAULT_PAYROLL_KIND_TRACK_MAP: PayrollKindTrackMap = {
  CAD: "DIGITAL",
  CAD_SURGERY: "DIGITAL",
  MANUAL: "MANUAL",
  PROCESSING: "SHOP_FLOOR",
  UNCATEGORIZED: "DIGITAL_MANUAL",
};

export function parsePayrollUserTrack(value: unknown): PayrollUserTrack | null {
  if (typeof value !== "string") return null;
  return (PAYROLL_USER_TRACK_VALUES as readonly string[]).includes(value)
    ? (value as PayrollUserTrack)
    : null;
}

export function normalizePayrollKindTrackMap(raw: unknown): PayrollKindTrackMap {
  const out = { ...DEFAULT_PAYROLL_KIND_TRACK_MAP };
  if (raw == null || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const kind of PAYROLL_WORK_KIND_VALUES) {
    const track = parsePayrollUserTrack(obj[kind]);
    if (track) out[kind] = track;
  }
  return out;
}

/** Роль USER: плашки ФОТ фильтруются по направлению; остальные роли ФОТ — все плашки. */
export function shouldFilterPayrollOptionsByTrack(role: UserRole): boolean {
  return role === "USER";
}

/**
 * Видна ли категория ФОТ пользователю с данным направлением.
 * «Цифра+Мануал» видит категории, привязанные к Цифре и Мануалу (и к себе).
 */
export function isPayrollKindVisibleForTrack(
  kind: PayrollWorkKindValue,
  track: PayrollUserTrack | null | undefined,
  map: PayrollKindTrackMap,
): boolean {
  if (!track) return true;
  const assigned = map[kind] ?? DEFAULT_PAYROLL_KIND_TRACK_MAP[kind];
  if (track === "DIGITAL_MANUAL") {
    return (
      assigned === "DIGITAL" ||
      assigned === "MANUAL" ||
      assigned === "DIGITAL_MANUAL"
    );
  }
  return assigned === track;
}

export function payrollTrackRequiredForRole(role: UserRole): boolean {
  return role === "USER";
}
