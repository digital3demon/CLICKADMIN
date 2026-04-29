/** Срочность в UI и в PATCH (совпадает с формой нового наряда) */
export const URGENT_UNSET = "UNSET";
export const URGENT_NO_COEF = "NO_COEF";

export const URGENT_MENU_OPTIONS: { value: string; label: string }[] = [
  { value: URGENT_UNSET, label: "Не указано" },
  { value: URGENT_NO_COEF, label: "Без коэффициента" },
  { value: "1.2", label: "×1,2" },
  { value: "1.5", label: "×1,5" },
  { value: "2", label: "×2" },
  { value: "3", label: "×3" },
];

const URGENT_NUMBERS = [1.2, 1.5, 2, 3];

export function isAllowedUrgentCoefficient(u: number): boolean {
  return URGENT_NUMBERS.some((x) => Math.abs(x - u) < 1e-6);
}

/** Значение для селекта срочности из полей заказа */
export function urgentSelectionFromOrder(
  isUrgent: boolean,
  urgentCoefficient: number | null,
): string {
  if (!isUrgent) return URGENT_UNSET;
  if (urgentCoefficient == null) return URGENT_NO_COEF;
  const key = String(urgentCoefficient);
  if (URGENT_MENU_OPTIONS.some((o) => o.value === key)) return key;
  return URGENT_NO_COEF;
}

/**
 * Множитель для суммы работ по наряду.
 * «Не указано» или «без коэффициента» → 1; иначе сохранённый коэффициент (×1,2 … ×3).
 */
export function orderUrgentPriceMultiplier(
  isUrgent: boolean,
  urgentCoefficient: number | null,
): number {
  if (!isUrgent) return 1;
  if (urgentCoefficient == null) return 1;
  const c = Number(urgentCoefficient);
  if (!Number.isFinite(c) || c <= 0) return 1;
  return c;
}

export function parseUrgentSelection(selection: string): {
  isUrgent: boolean;
  urgentCoefficient: number | null;
} {
  if (selection === URGENT_UNSET) {
    return { isUrgent: false, urgentCoefficient: null };
  }
  if (selection === URGENT_NO_COEF) {
    return { isUrgent: true, urgentCoefficient: null };
  }
  const u = Number(selection);
  if (Number.isNaN(u) || !isAllowedUrgentCoefficient(u)) {
    throw new Error("INVALID_URGENT");
  }
  return { isUrgent: true, urgentCoefficient: u };
}
