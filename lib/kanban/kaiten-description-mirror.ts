import { getKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";

/** Свежее описание из кэша GET /kaiten, иначе зеркало в БД. */
export function bestKaitenDescriptionMirrorForKanban(
  orderId: string,
  kaitenCardId: number | null,
  dbMirror: string | null | undefined,
): string | null {
  const stored = dbMirror?.trim() ?? "";
  if (kaitenCardId == null) {
    return stored || null;
  }
  const snap = getKaitenSnapshotCache(orderId.trim());
  const card = snap?.card;
  if (card && typeof card === "object" && !Array.isArray(card)) {
    const raw = (card as Record<string, unknown>).description;
    if (typeof raw === "string" && raw.trim()) {
      const live = raw.trim();
      if (!stored || live.length > stored.length) return live;
      return stored;
    }
  }
  return stored || null;
}
