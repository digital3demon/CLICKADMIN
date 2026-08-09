/**
 * Степпер «в пути»: Заказал → Пришла → Проверил → Готово.
 * Даты: resolvedAt / arrivedAt / checkedAt / completedAt.
 * «Готово» выставляется вместе с «Проверил» (отдельный клик не нужен).
 */

export type ProstheticsInTransitStep =
  | "ordered"
  | "arrived"
  | "checked"
  | "done";

export type ProstheticsProgressStep = "arrived" | "checked" | "completed";

export type ProstheticsStepDates = {
  resolvedAt: Date | string | null;
  arrivedAt?: Date | string | null;
  checkedAt?: Date | string | null;
  completedAt?: Date | string | null;
};

function hasDate(v: Date | string | null | undefined): boolean {
  if (v == null) return false;
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  return String(v).trim().length > 0;
}

/** Текущий шаг по заполненным датам (после Готово — done). */
export function prostheticsInTransitStepFromDates(
  dates: ProstheticsStepDates,
): ProstheticsInTransitStep {
  if (hasDate(dates.completedAt)) return "done";
  if (hasDate(dates.checkedAt)) return "checked";
  if (hasDate(dates.arrivedAt)) return "arrived";
  return "ordered";
}

/**
 * Можно ли выставить progress-шаг: нельзя перепрыгнуть,
 * предыдущий шаг обязателен, повтор того же шага — нет.
 */
export function canAdvanceProstheticsProgressStep(
  dates: ProstheticsStepDates,
  next: ProstheticsProgressStep,
): { ok: true } | { ok: false; error: string } {
  if (!hasDate(dates.resolvedAt)) {
    return { ok: false, error: "Сначала примите заявку (протетика в пути)" };
  }
  if (hasDate(dates.completedAt)) {
    return { ok: false, error: "Заявка уже закрыта" };
  }

  const current = prostheticsInTransitStepFromDates(dates);

  if (next === "arrived") {
    if (current !== "ordered") {
      return {
        ok: false,
        error:
          current === "arrived" || current === "checked"
            ? "Уже отмечено «пришла»"
            : "Нельзя отметить «пришла» на этом шаге",
      };
    }
    return { ok: true };
  }

  if (next === "checked") {
    if (current !== "arrived") {
      return {
        ok: false,
        error:
          current === "ordered"
            ? "Сначала отметьте «пришла»"
            : current === "checked"
              ? "Уже отмечено «проверил»"
              : "Нельзя отметить «проверил» на этом шаге",
      };
    }
    return { ok: true };
  }

  // completed
  if (current !== "checked") {
    return {
      ok: false,
      error:
        current === "ordered" || current === "arrived"
          ? "Сначала отметьте «проверил»"
          : "Нельзя закрыть заявку на этом шаге",
    };
  }
  return { ok: true };
}
