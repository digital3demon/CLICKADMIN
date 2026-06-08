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

/** asap из Kaiten → isUrgent в CRM (без изменения urgentCoefficient). */
export function kaitenUrgentPatchFromCard(
  card: Record<string, unknown>,
  currentIsUrgent: boolean,
): { isUrgent?: boolean } {
  if (!("asap" in card)) return {};
  const asap = card.asap === true;
  if (asap === currentIsUrgent) return {};
  return { isUrgent: asap };
}

export type KaitenInboundHeadDetectInput = {
  computedTitle: string;
  computedDescription: string;
  kaitenCardTitleManual: boolean;
  kaitenCardDescriptionManual: boolean;
};

/**
 * Если title/description в Kaiten расходятся с CRM-вычислением — считаем шапку ручной.
 * Не сбрасывает manual, если уже true (липкий до явного сброса через PATCH label/notes).
 */
export function kaitenManualFlagsFromInboundCard(
  card: Record<string, unknown>,
  ctx: KaitenInboundHeadDetectInput,
): Pick<
  Prisma.OrderUpdateInput,
  "kaitenCardTitleManual" | "kaitenCardDescriptionManual"
> {
  const out: Pick<
    Prisma.OrderUpdateInput,
    "kaitenCardTitleManual" | "kaitenCardDescriptionManual"
  > = {};
  const rawTitle = typeof card.title === "string" ? card.title.trim() : "";
  const rawDesc =
    typeof card.description === "string" ? card.description.trim() : "";
  if (
    !ctx.kaitenCardTitleManual &&
    rawTitle &&
    rawTitle !== ctx.computedTitle.trim()
  ) {
    out.kaitenCardTitleManual = true;
  }
  if (
    !ctx.kaitenCardDescriptionManual &&
    rawDesc !== ctx.computedDescription.trim()
  ) {
    out.kaitenCardDescriptionManual = true;
  }
  return out;
}
