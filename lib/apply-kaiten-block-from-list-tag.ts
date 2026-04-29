import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import {
  kaitenBlockStateFromCard,
  normalizeKaitenBlockReasonInput,
} from "@/lib/kaiten-card-block";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import {
  getKaitenRestAuth,
  kaitenGetCard,
  kaitenPatchCard,
  kaitenPostCardBlocker,
  trackLaneForBoardId,
} from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { recordOrderRevision } from "@/lib/record-order-revision";
import type { KaitenBlockFromListTagResult } from "@/lib/custom-list-tag-kaiten-block-label";

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
 * Заблокировать карточку Kaiten с причиной и обновить зеркало в БД (как PATCH kaiten с blocked:true).
 */
export async function applyKaitenBlockForOrderIfUnblocked(
  orderId: string,
  reasonRaw: string,
): Promise<KaitenBlockFromListTagResult> {
  const normalized = normalizeKaitenBlockReasonInput(reasonRaw);
  if (!normalized) {
    return { kind: "error", message: "Укажите причину блокировки" };
  }

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
  if (order.kaitenBlocked) {
    return { kind: "skipped", reason: "already_blocked" };
  }

  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) {
    return { kind: "skipped", reason: "kaiten_not_configured" };
  }
  const cfg = await withResolvedKaitenBoards(cfg0);

  const burst = { burst: true } as const;

  const patch: Record<string, unknown> = {};
  const post = await kaitenPostCardBlocker(
    auth,
    order.kaitenCardId,
    normalized,
    burst,
  );
  if (!post.ok) {
    patch.blocked = true;
    patch.block_reason = normalized;
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
        message: updated.error ?? "Kaiten не принял блокировку",
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
        message: fresh.error ?? "Kaiten не вернул карточку после блокировки",
      };
    }
  }

  if (!updated?.card) {
    return { kind: "error", message: "Нет данных карточки после запроса" };
  }

  const fromCard = kaitenBlockStateFromCard(updated.card as Record<string, unknown>);
  let kaitenBlocked = fromCard.blocked;
  let kaitenBlockReason = fromCard.reason;
  if (!kaitenBlocked) {
    kaitenBlocked = true;
    kaitenBlockReason = normalized;
  } else if (!kaitenBlockReason) {
    kaitenBlockReason = normalized;
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
    nextTrack != null ? nextTrack : undefined;

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        kaitenSyncedAt: new Date(),
        kaitenSyncError: null,
        ...(laneToStore != null ? { kaitenTrackLane: laneToStore } : {}),
        ...mirrorFieldsFromKaitenCard(updated.card as Record<string, unknown>),
        kaitenBlocked,
        kaitenBlockReason,
      },
    });
    void recordOrderRevision(orderId.trim(), { kind: "SAVE" }).catch((revErr) => {
      console.error("[list-tag kaiten block] revision log", revErr);
    });
  } catch (e) {
    console.error("[list-tag kaiten block] prisma", e);
    return { kind: "error", message: "Не удалось сохранить состояние в CRM" };
  }

  invalidateKaitenSnapshotCache(orderId.trim());
  return { kind: "done" };
}
