import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { isHandedToAdminsKaitenColumnTitle } from "@/lib/sticker-public-client-copy";

type RevisionRow = {
  createdAt: Date;
  snapshot: unknown;
};

export type HandedToAdminsFallback = {
  labWorkStatus: string;
  kaitenColumnTitle: string | null;
  updatedAt: Date;
  kaitenSyncedAt?: Date | null;
};

function columnFromSnapshot(snap: NonNullable<ReturnType<typeof parseSnapshotV1>>) {
  if (!("kaitenColumnTitle" in snap.order)) return null;
  const t = String(snap.order.kaitenColumnTitle ?? "").trim();
  return t || null;
}

/**
 * Первый момент «Сдана админам»: переход labWorkStatus в TO_ADMINS или колонки Kaiten
 * на «сдана админам» в журнале ревизий; иначе — текущая колонка/статус на наряде.
 */
export function findFirstHandedToAdminsAt(
  revisions: RevisionRow[],
  fallback?: HandedToAdminsFallback | null,
): Date | null {
  let prevLab: string | null = null;
  let prevColHanded = false;

  for (const rev of revisions) {
    const snap = parseSnapshotV1(rev.snapshot);
    if (!snap) continue;
    const currentLab = String(snap.order.labWorkStatus || "").trim();
    const colTitle = columnFromSnapshot(snap);
    const colHanded = isHandedToAdminsKaitenColumnTitle(colTitle);

    if (prevLab !== "TO_ADMINS" && currentLab === "TO_ADMINS") {
      return rev.createdAt;
    }
    if (!prevColHanded && colHanded) {
      return rev.createdAt;
    }

    if (currentLab) prevLab = currentLab;
    if (colTitle != null) prevColHanded = colHanded;
  }

  if (fallback) {
    if (isHandedToAdminsKaitenColumnTitle(fallback.kaitenColumnTitle)) {
      return fallback.kaitenSyncedAt ?? fallback.updatedAt;
    }
    if (fallback.labWorkStatus === "TO_ADMINS") {
      return fallback.updatedAt;
    }
  }
  return null;
}
