import type { Prisma } from "@prisma/client";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";

/** Поля зеркала шапки из объекта карточки Kaiten. */
export function kaitenMirrorFieldsFromCard(card: Record<string, unknown>): {
  kaitenCardTitleMirror?: string | null;
  kaitenCardDescriptionMirror?: string | null;
  kaitenCardSortOrder?: number | null;
} {
  const out: {
    kaitenCardTitleMirror?: string | null;
    kaitenCardDescriptionMirror?: string | null;
    kaitenCardSortOrder?: number | null;
  } = {};
  if ("title" in card) {
    const t = typeof card.title === "string" ? card.title.trim() : "";
    out.kaitenCardTitleMirror = t.length ? t : null;
  }
  if ("description" in card) {
    out.kaitenCardDescriptionMirror =
      typeof card.description === "string" ? card.description : null;
  }
  if ("sort_order" in card) {
    out.kaitenCardSortOrder = kaitenSortOrderFromCard(card);
  }
  return out;
}

/**
 * «Срочно» наряда (`isUrgent`) и asap в Kaiten / срочно карточки канбана —
 * разные флаги. Kaiten не пишет isUrgent.
 */
export function kaitenUrgentPatchFromCard(
  _card: Record<string, unknown>,
  _currentIsUrgent: boolean,
): { isUrgent?: boolean } {
  return {};
}

export type KaitenInboundHeadDetectInput = {
  computedTitle: string;
  computedDescription: string;
  kaitenCardTitleManual: boolean;
  kaitenCardDescriptionManual: boolean;
};

/**
 * Раньше помечали шапку «ручной», если Kaiten расходился с нарядом.
 * Сейчас наряд главный — флаги manual не выставляем из входящего Kaiten.
 */
export function kaitenManualFlagsFromInboundCard(
  _card: Record<string, unknown>,
  _ctx: KaitenInboundHeadDetectInput,
): Pick<
  Prisma.OrderUpdateInput,
  "kaitenCardTitleManual" | "kaitenCardDescriptionManual"
> {
  return {};
}
