import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  getKaitenRestAuth,
  kaitenGetCard,
  kaitenPatchCard,
  kaitenReleaseActiveCardBlockers,
  trackLaneForBoardId,
} from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { recordOrderRevision } from "@/lib/record-order-revision";
import type { KaitenUnblockFromListTagResult } from "@/lib/custom-list-tag-kaiten-unblock-label";

function mirrorFieldsFromKaitenCard(card: Record<string, unknown>): {
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
 * Снять блокировку карточки Kaiten и обновить зеркало в БД (как PATCH kaiten с blocked:false).
 * Вызывать только если наряд сейчас помечен как заблокированный в CRM.
 */
export async function applyKaitenUnblockForOrderIfBlocked(
  orderId: string,
): Promise<KaitenUnblockFromListTagResult> {
  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
      kaitenBlocked: true,
    },
  });
  if (!order) {
    return { kind: "error", message: "Наряд не найден" };
  }
  if (order.kaitenCardId == null) {
    return { kind: "skipped", reason: "no_card" };
  }
  if (!order.kaitenBlocked) {
    return { kind: "skipped", reason: "not_blocked" };
  }

  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) {
    return { kind: "skipped", reason: "kaiten_not_configured" };
  }
  const cfg = await withResolvedKaitenBoards(cfg0);

  const burst = { burst: true } as const;

  const patch: Record<string, unknown> = {};
  const released = await kaitenReleaseActiveCardBlockers(
    auth,
    order.kaitenCardId,
    burst,
  );
  if (!released.ok) {
    patch.blocked = false;
  }

  let updated: {
    ok: boolean;
    card: Record<string, unknown> | null;
    error: string | null;
  } | null = null;

  if (Object.keys(patch).length > 0) {
    updated = await kaitenPatchCard(auth, order.kaitenCardId, patch, burst);
    if (!updated.ok || !updated.card) {
      return {
        kind: "error",
        message: updated.error ?? "Kaiten не принял разблокировку",
      };
    }
  }

  if (!updated?.card) {
    const fresh = await kaitenGetCard(auth, order.kaitenCardId, burst);
    if (fresh.ok && fresh.card) {
      updated = { ok: true, card: fresh.card, error: null };
    } else {
      return {
        kind: "error",
        message:
          fresh.error ?? "Kaiten не вернул карточку после разблокировки",
      };
    }
  }

  if (!updated?.card) {
    return { kind: "error", message: "Нет данных карточки после запроса" };
  }

  const boardIdRaw = updated.card.board_id;
  const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
  const preferLaneForBoard = order.kaitenTrackLane ?? null;
  let nextTrack: ReturnType<typeof trackLaneForBoardId> | null | undefined;
  if (boardId != null) {
    nextTrack = trackLaneForBoardId(
      boardId,
      cfg.boardByLane,
      preferLaneForBoard,
    );
  }
  const laneToStore =
    nextTrack != null
      ? nextTrack
      : undefined;

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        kaitenSyncedAt: new Date(),
        kaitenSyncError: null,
        ...(laneToStore != null ? { kaitenTrackLane: laneToStore } : {}),
        ...mirrorFieldsFromKaitenCard(updated.card as Record<string, unknown>),
        kaitenBlocked: false,
        kaitenBlockReason: null,
      },
    });
    void recordOrderRevision(orderId.trim(), { kind: "SAVE" }).catch((revErr) => {
      console.error("[list-tag kaiten unblock] revision log", revErr);
    });
  } catch (e) {
    console.error("[list-tag kaiten unblock] prisma", e);
    return { kind: "error", message: "Не удалось сохранить состояние в CRM" };
  }

  invalidateKaitenSnapshotCache(orderId.trim());
  return { kind: "done" };
}
