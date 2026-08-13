/**
 * Степпер протетики:
 * Подтвердил (resolvedAt) → Заказал (orderedAt) → Пришла → Проверил → Готово.
 * Каждый шаг — отдельный клик (Готово = completedAt).
 */

export type ProstheticsInTransitStep =
  | "confirmed"
  | "ordered"
  | "arrived"
  | "checked"
  | "done";

export type ProstheticsProgressStep =
  | "ordered"
  | "arrived"
  | "checked"
  | "completed";

export type ProstheticsStepDates = {
  resolvedAt: Date | string | null;
  orderedAt?: Date | string | null;
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
  if (hasDate(dates.orderedAt)) return "ordered";
  return "confirmed";
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
    return { ok: false, error: "Сначала подтвердите заявку" };
  }
  if (hasDate(dates.completedAt)) {
    return { ok: false, error: "Заявка уже закрыта" };
  }

  const current = prostheticsInTransitStepFromDates(dates);

  if (next === "ordered") {
    if (current !== "confirmed") {
      return {
        ok: false,
        error:
          current === "ordered" ||
          current === "arrived" ||
          current === "checked"
            ? "Уже отмечено «заказал»"
            : "Нельзя отметить «заказал» на этом шаге",
      };
    }
    return { ok: true };
  }

  if (next === "arrived") {
    if (current !== "ordered") {
      return {
        ok: false,
        error:
          current === "confirmed"
            ? "Сначала отметьте «заказал»"
            : current === "arrived" || current === "checked"
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
          current === "confirmed" || current === "ordered"
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
        current === "confirmed" ||
        current === "ordered" ||
        current === "arrived"
          ? "Сначала отметьте «проверил»"
          : "Нельзя закрыть заявку на этом шаге",
    };
  }
  return { ok: true };
}
