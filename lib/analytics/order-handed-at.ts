import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";

type RevisionRow = {
  createdAt: Date;
  snapshot: unknown;
};

/** Первый переход labWorkStatus в TO_ADMINS по журналу ревизий. */
export function findFirstHandedToAdminsAt(
  revisions: RevisionRow[],
  fallback?: { labWorkStatus: string; updatedAt: Date } | null,
): Date | null {
  let prev: string | null = null;
  for (const rev of revisions) {
    const snap = parseSnapshotV1(rev.snapshot);
    if (!snap) continue;
    const current = String(snap.order.labWorkStatus || "").trim();
    if (
      prev !== "TO_ADMINS" &&
      current === "TO_ADMINS"
    ) {
      return rev.createdAt;
    }
    if (current) prev = current;
  }
  if (fallback?.labWorkStatus === "TO_ADMINS") {
    return fallback.updatedAt;
  }
  return null;
}
