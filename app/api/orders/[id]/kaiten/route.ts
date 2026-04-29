import { NextResponse } from "next/server";
import type { KaitenTrackLane, Prisma } from "@prisma/client";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenEnvConfig, listConfiguredKaitenTrackLanes } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import {
  findKaitenColumnIdByTitle,
  kaitenColumnTitleFromBoard,
} from "@/lib/kaiten-column-title";
import {
  getKaitenRestAuth,
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenListBoardLanes,
  kaitenListComments,
  kaitenPatchCard,
  kaitenPostCardBlocker,
  kaitenReleaseActiveCardBlockers,
  trackLaneForBoardId,
} from "@/lib/kaiten-rest";
import {
  getKaitenSnapshotCache,
  invalidateKaitenSnapshotCache,
  setKaitenSnapshotCache,
} from "@/lib/kaiten-snapshot-cache";
import {
  kaitenBlockStateFromCard,
  normalizeKaitenBlockReasonInput,
} from "@/lib/kaiten-card-block";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import {
  kaitenCommentsForSyncFromSnapshotPayload,
  syncOrderChatCorrectionsFromKaitenComments,
} from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";
import { recordOrderRevision } from "@/lib/record-order-revision";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";

const TRACK_LANES: KaitenTrackLane[] = ["ORTHOPEDICS", "ORTHODONTICS", "TEST"];

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

type PatchBody = {
  title?: string;
  /** Текст описания карточки в Kaiten (как в UI Kaiten). */
  description?: string;
  kaitenTrackLane?: KaitenTrackLane;
  columnId?: number;
  /**
   * Название колонки как на доске-зеркале в CRM; сервер подставит `column_id` в Kaiten.
   * Не используется вместе с `columnId` (приоритет у `columnId`).
   */
  columnTitle?: string;
  laneId?: number | null;
  /** Заблокировать карточку в Kaiten (нужен blockReason) */
  blocked?: boolean;
  /** Текст причины; при blocked=true обязателен */
  blockReason?: string | null;
  /** Порядок в колонке Kaiten (`sort_order` в API). */
  sortOrder?: number;
  /**
   * Тип карточки в справочнике CRM (`KaitenCardType.id`); сервер подставит `type_id` в Kaiten.
   * Пустая строка или null — снять тип только в CRM (в Kaiten тип не трогаем).
   */
  kaitenCardTypeId?: string | null;
};

/**
 * Не перезаписывать блокировку в Prisma при PATCH без `blocked`: ответ Kaiten часто без
 * полей блокировки — kaitenBlockStateFromCard тогда даёт false и «снимает» блок в CRM.
 * При blocked: true, если в ответе карточки нет признака блока, берём причину из тела запроса.
 */
function blockFieldsForPrismaAfterPatch(
  body: PatchBody,
  card: Record<string, unknown>,
): { kaitenBlocked: boolean; kaitenBlockReason: string | null } | null {
  if (typeof body.blocked !== "boolean") return null;
  if (!body.blocked) {
    return { kaitenBlocked: false, kaitenBlockReason: null };
  }
  const fromCard = kaitenBlockStateFromCard(card);
  if (fromCard.blocked) {
    return {
      kaitenBlocked: true,
      kaitenBlockReason: fromCard.reason,
    };
  }
  const reason = normalizeKaitenBlockReasonInput(body.blockReason);
  return {
    kaitenBlocked: true,
    kaitenBlockReason: reason,
  };
}

function kaitenRateLimitMessage(status: number, raw: string | null | undefined): string | null {
  if (status === 429) return "rate_limit";
  if (raw && /too many requests/i.test(raw)) return "rate_limit";
  return null;
}

function friendlyKaitenLoadError(
  status: number,
  raw: string | null | undefined,
  fallback: string,
): string {
  return kaitenRateLimitMessage(status, raw)
    ? "Слишком много запросов к Kaiten. Подождите 1–2 минуты и обновите страницу."
    : raw?.trim() || fallback;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 5xx / обрыв на стороне Kaiten — пригодно для 2–3 повторов, не 429. */
function isTransientKaitenHttpStatus(status: number): boolean {
  if (status === 429) return false;
  if (status >= 500 && status < 600) return true;
  return false;
}

/** Синхрон корректировок/протетики из чата Kaiten — не блокирует ответ вкладки. */
function scheduleKaitenCommentSyncFromSnapshot(
  prisma: Awaited<ReturnType<typeof getOrdersPrisma>>,
  auth: NonNullable<ReturnType<typeof getKaitenRestAuth>>,
  orderId: string,
  cardId: number,
  cachedSnapshot: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const comm = await kaitenListComments(auth, cardId);
      if (comm.ok) {
        const parsed = dedupeParsedKaitenComments(
          comm.comments
            .map(parseKaitenListComment)
            .filter((x): x is NonNullable<typeof x> => x != null),
        ).map((c) => ({ id: c.id, text: c.text }));
        await syncOrderChatCorrectionsFromKaitenComments(
          prisma,
          orderId.trim(),
          parsed,
        );
        await syncOrderProstheticsRequestsFromKaitenComments(
          prisma,
          orderId.trim(),
          parsed,
        );
      } else {
        const snapComments = kaitenCommentsForSyncFromSnapshotPayload(
          cachedSnapshot,
        );
        await syncOrderChatCorrectionsFromKaitenComments(
          prisma,
          orderId.trim(),
          snapComments,
        );
        await syncOrderProstheticsRequestsFromKaitenComments(
          prisma,
          orderId.trim(),
          snapComments,
        );
      }
    } catch (e) {
      console.error("[kaiten GET] correction sync (background)", e);
    }
  })();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ordersPrisma = await getOrdersPrisma();
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) {
    return NextResponse.json(
      { error: "Kaiten не настроен (KAITEN_API_TOKEN и доски в .env)" },
      { status: 503 },
    );
  }
  const burst = { burst: true } as const;
  const cfg = await withResolvedKaitenBoards(cfg0, burst);

  const order = await ordersPrisma.order.findUnique({
    where: { id: orderId.trim() },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (order.kaitenCardId == null) {
    return NextResponse.json(
      { error: "К карточке Kaiten не привязано (создайте наряд с выгрузкой в Kaiten)" },
      { status: 400 },
    );
  }

  const listUrl = new URL(req.url);
  const bypassCache =
    listUrl.searchParams.get("refresh") === "1" ||
    listUrl.searchParams.get("nocache") === "1";

  if (!bypassCache) {
    const cached = getKaitenSnapshotCache(orderId.trim());
    if (cached != null) {
      scheduleKaitenCommentSyncFromSnapshot(
        ordersPrisma,
        auth,
        orderId.trim(),
        order.kaitenCardId,
        cached as Record<string, unknown>,
      );
      return NextResponse.json(cached, {
        headers: { "X-Kaiten-Snapshot-Cache": "hit" },
      });
    }
  }

  const orderIdTrim = orderId.trim();
  const maxKaitenLoadAttempts = 3;
  type Cr = Awaited<ReturnType<typeof kaitenGetCard>>;
  type Ccols = Awaited<ReturnType<typeof kaitenListBoardColumns>>;
  type Clns = Awaited<ReturnType<typeof kaitenListBoardLanes>>;
  type Ccomm = Awaited<ReturnType<typeof kaitenListComments>>;

  let lastCard: Cr | undefined;
  let lastCols: Ccols | undefined;
  let lastLns: Clns | undefined;
  let lastComm: Ccomm | undefined;

  for (let att = 0; att < maxKaitenLoadAttempts; att++) {
    if (att > 0) {
      await sleepMs(300 * att);
    }
    const cr = await kaitenGetCard(auth, order.kaitenCardId, burst);
    lastCard = cr;
    if (!cr.ok || !cr.card) {
      if (att < maxKaitenLoadAttempts - 1 && isTransientKaitenHttpStatus(cr.status)) {
        continue;
      }
      lastCols = lastLns = lastComm = undefined;
      break;
    }
    const boardIdRaw0 = (cr.card as Record<string, unknown>).board_id;
    const bId =
      typeof boardIdRaw0 === "number" ? boardIdRaw0 : null;
    if (bId == null) {
      lastCols = lastLns = lastComm = undefined;
      break;
    }
    const [c, ln, co] = await Promise.all([
      kaitenListBoardColumns(auth, bId, burst),
      kaitenListBoardLanes(auth, bId, burst),
      kaitenListComments(auth, order.kaitenCardId, burst),
    ]);
    lastCols = c;
    lastLns = ln;
    lastComm = co;
    if (!c.ok) {
      if (att < maxKaitenLoadAttempts - 1 && isTransientKaitenHttpStatus(c.status)) {
        continue;
      }
      break;
    }
    if (!ln.ok) {
      if (att < maxKaitenLoadAttempts - 1 && isTransientKaitenHttpStatus(ln.status)) {
        continue;
      }
      break;
    }
    if (!co.ok) {
      if (att < maxKaitenLoadAttempts - 1 && isTransientKaitenHttpStatus(co.status)) {
        continue;
      }
      break;
    }
    break;
  }

  const haveFresh =
    lastCard != null &&
    lastCard.ok &&
    lastCard.card != null &&
    lastCols != null &&
    lastCols.ok &&
    lastLns != null &&
    lastLns.ok &&
    lastComm != null &&
    lastComm.ok;

  if (!haveFresh) {
    const stale = getKaitenSnapshotCache(orderIdTrim);
    if (stale) {
      return NextResponse.json(
        { ...stale, kaitenSnapshotStale: true },
        { headers: { "X-Kaiten-Snapshot-Cache": "stale" } },
      );
    }
    if (!lastCard || !lastCard.ok || !lastCard.card) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            lastCard?.status ?? 502,
            lastCard && "error" in lastCard ? lastCard.error : null,
            "Не удалось загрузить карточку Kaiten",
          ),
        },
        { status: 502 },
      );
    }
    if (
      typeof (lastCard.card as Record<string, unknown>).board_id !==
      "number"
    ) {
      return NextResponse.json(
        { error: "В ответе Kaiten нет board_id" },
        { status: 502 },
      );
    }
    if (!lastCols || !lastCols.ok) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            lastCols?.status ?? 502,
            lastCols?.error,
            "Не удалось загрузить колонки доски Kaiten",
          ),
        },
        { status: 502 },
      );
    }
    if (!lastLns || !lastLns.ok) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            lastLns?.status ?? 502,
            lastLns?.error,
            "Не удалось загрузить дорожки доски Kaiten",
          ),
        },
        { status: 502 },
      );
    }
    if (!lastComm || !lastComm.ok) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            lastComm?.status ?? 502,
            lastComm?.error,
            "Не удалось загрузить комментарии Kaiten",
          ),
        },
        { status: 502 },
      );
    }
  }

  const cardRes = lastCard!;
  const cols = lastCols!;
  const lns = lastLns!;
  const comm = lastComm!;

  const boardIdRaw = (cardRes.card as Record<string, unknown>).board_id;
  const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
  if (boardId == null) {
    return NextResponse.json(
      { error: "В ответе Kaiten нет board_id" },
      { status: 502 },
    );
  }

  const trackFromCard = trackLaneForBoardId(
    boardId,
    cfg.boardByLane,
    order.kaitenTrackLane,
  );
  const trackLane = trackFromCard ?? order.kaitenTrackLane ?? null;

  const comments = dedupeParsedKaitenComments(
    comm.comments
      .map(parseKaitenListComment)
      .filter((x): x is NonNullable<typeof x> => x != null),
  );

  const cardObj = cardRes.card as Record<string, unknown>;
  const columnTitle = kaitenColumnTitleFromBoard(cardObj, cols.columns);
  const { blocked: kBlocked, reason: kBlockReason } =
    kaitenBlockStateFromCard(cardObj);

  const payload = {
    configured: true,
    card: cardRes.card,
    trackLane,
    orderTrackLane: order.kaitenTrackLane,
    columns: cols.columns,
    lanes: lns.lanes,
    comments,
    kaitenCardUrl: getKaitenCardWebUrl(order.kaitenCardId),
    spaces: listConfiguredKaitenTrackLanes(cfg)
      .filter((lane) => cfg.boardByLane[lane]?.boardId != null)
      .map((lane) => {
      const t = cfg.boardByLane[lane]!;
      return {
        lane,
        boardId: t.boardId!,
        label:
          lane === "ORTHOPEDICS"
            ? "Ортопедия"
            : lane === "ORTHODONTICS"
              ? "Ортодонтия"
              : "Тест",
      };
    }),
  };
  setKaitenSnapshotCache(orderIdTrim, payload as Record<string, unknown>);

  void (async () => {
    try {
      await syncOrderChatCorrectionsFromKaitenComments(
        ordersPrisma,
        orderIdTrim,
        comments,
      );
      await syncOrderProstheticsRequestsFromKaitenComments(
        ordersPrisma,
        orderIdTrim,
        comments,
      );
    } catch (e) {
      console.error("[kaiten GET] correction sync (deferred)", e);
    }
    try {
      await ordersPrisma.order.update({
        where: { id: orderIdTrim },
        data: {
          kaitenColumnTitle: columnTitle,
          kaitenBlocked: kBlocked,
          kaitenBlockReason: kBlockReason,
          ...mirrorFieldsFromKaitenCard(cardObj),
        },
      });
    } catch (e) {
      console.error("[kaiten GET] kaitenColumnTitle / block (deferred)", e);
    }
  })();

  return NextResponse.json(payload, {
    headers: { "X-Kaiten-Snapshot-Cache": "miss" },
  });
}

type KaitenPostBody =
  | {
      action: "create";
      kaitenTrackLane?: KaitenTrackLane;
      kaitenCardTypeId?: string | null;
      columnId?: number;
    }
  | { action: "link"; cardId: number };

/**
 * Создать карточку Kaiten для наряда (повтор попытки) или привязать существующую по numeric id.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const [ordersPrisma, clientsPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
  ]);
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: KaitenPostBody;
  try {
    body = (await req.json()) as KaitenPostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const idTrim = orderId.trim();
  const existing = await ordersPrisma.order.findUnique({
    where: { id: idTrim },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
      kaitenDecideLater: true,
      kaitenCardTypeId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  if (body?.action === "create") {
    if (existing.kaitenCardId != null) {
      invalidateKaitenSnapshotCache(idTrim);
      try {
        await syncUnpushedOrderAttachmentsToKaiten(idTrim, ordersPrisma);
      } catch (e) {
        console.error("[kaiten POST create] syncUnpushed (existing card)", e);
      }
      return NextResponse.json({
        ok: true,
        kaitenCardId: existing.kaitenCardId,
        message: "Карточка уже была привязана",
      });
    }

    const b = body as {
      action: "create";
      kaitenTrackLane?: KaitenTrackLane;
      kaitenCardTypeId?: string | null;
      columnId?: number;
    };

    const data: Prisma.OrderUpdateInput = {};
    if (b.kaitenTrackLane != null) {
      if (!TRACK_LANES.includes(b.kaitenTrackLane)) {
        return NextResponse.json(
          { error: "Неизвестное пространство (дорожка)" },
          { status: 400 },
        );
      }
      data.kaitenTrackLane = b.kaitenTrackLane;
    }
    if (b.kaitenCardTypeId !== undefined) {
      if (b.kaitenCardTypeId === null || b.kaitenCardTypeId === "") {
        data.kaitenCardType = { disconnect: true };
      } else {
        const kid = String(b.kaitenCardTypeId).trim();
        const kt = await clientsPrisma.kaitenCardType.findFirst({
          where: { id: kid },
          select: { id: true },
        });
        if (!kt) {
          return NextResponse.json(
            { error: "Тип карточки Kaiten не найден" },
            { status: 400 },
          );
        }
        data.kaitenCardType = { connect: { id: kid } };
      }
    }
    const laneAfter =
      b.kaitenTrackLane != null ? b.kaitenTrackLane : existing.kaitenTrackLane;
    let typeIdAfter: string | null = existing.kaitenCardTypeId ?? null;
    if (b.kaitenCardTypeId !== undefined) {
      if (b.kaitenCardTypeId === null || b.kaitenCardTypeId === "") {
        typeIdAfter = null;
      } else {
        typeIdAfter = String(b.kaitenCardTypeId).trim();
      }
    }
    if (
      existing.kaitenDecideLater === true &&
      laneAfter != null &&
      typeIdAfter != null &&
      typeIdAfter.length > 0
    ) {
      data.kaitenDecideLater = false;
    }
    if (Object.keys(data).length > 0) {
      await ordersPrisma.order.update({ where: { id: idTrim }, data });
    }

    if (b.columnId != null) {
      if (typeof b.columnId !== "number" || !Number.isFinite(b.columnId) || b.columnId <= 0) {
        return NextResponse.json(
          { error: "Некорректный columnId" },
          { status: 400 },
        );
      }
      const ord = await ordersPrisma.order.findUnique({
        where: { id: idTrim },
        select: { kaitenTrackLane: true },
      });
      const lane = ord?.kaitenTrackLane;
      if (lane == null) {
        return NextResponse.json(
          {
            error:
              "Не выбрано пространство (дорожка). Укажите его в запросе или в наряде.",
          },
          { status: 400 },
        );
      }
      if (!TRACK_LANES.includes(lane)) {
        return NextResponse.json(
          { error: "В наряде некорректная дорожка Kaiten" },
          { status: 400 },
        );
      }
      const auth = getKaitenRestAuth();
      const cfg0 = getKaitenEnvConfig();
      if (!auth || !cfg0) {
        return NextResponse.json(
          { error: "Kaiten не настроен" },
          { status: 503 },
        );
      }
      const cfg = await withResolvedKaitenBoards(cfg0, { burst: true } as const);
      const target = cfg.boardByLane[lane];
      if (target == null || target.boardId == null) {
        return NextResponse.json(
          { error: "Для выбранного пространства нет доски Kaiten в .env" },
          { status: 400 },
        );
      }
      const cols = await kaitenListBoardColumns(
        auth,
        target.boardId,
        { burst: true } as const,
      );
      if (!cols.ok) {
        return NextResponse.json(
          { error: cols.error ?? "Не удалось проверить колонки Kaiten" },
          { status: 502 },
        );
      }
      if (!cols.columns.some((c) => c.id === b.columnId)) {
        return NextResponse.json(
          {
            error: "Колонка с таким id нет на доске выбранного пространства",
          },
          { status: 400 },
        );
      }
    }

    const result = await syncNewOrderToKaiten(idTrim, {
      columnId: b.columnId,
    });
    if (result.ok) {
      invalidateKaitenSnapshotCache(idTrim);
      try {
        await syncUnpushedOrderAttachmentsToKaiten(idTrim, ordersPrisma);
      } catch (e) {
        console.error("[kaiten POST create] syncUnpushed after create", e);
      }
      return NextResponse.json({ ok: true, kaitenCardId: result.kaitenCardId });
    }
    return NextResponse.json(
      { error: result.error },
      { status: result.httpStatus },
    );
  }

  if (body?.action === "link") {
    if (existing.kaitenCardId != null) {
      return NextResponse.json(
        { error: "Карточка Kaiten уже привязана к наряду" },
        { status: 400 },
      );
    }
    const cardId = body.cardId;
    if (typeof cardId !== "number" || !Number.isFinite(cardId) || cardId <= 0) {
      return NextResponse.json(
        { error: "Укажите числовой id карточки из Kaiten (из URL)" },
        { status: 400 },
      );
    }
    const auth = getKaitenRestAuth();
    const cfg0 = getKaitenEnvConfig();
    if (!auth || !cfg0) {
      return NextResponse.json(
        { error: "Kaiten не настроен" },
        { status: 503 },
      );
    }
    const burst = { burst: true } as const;
    const cfg = await withResolvedKaitenBoards(cfg0, burst);
    const cr = await kaitenGetCard(auth, cardId, burst);
    if (!cr.ok || !cr.card) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            cr?.status ?? 404,
            cr && "error" in cr ? cr.error : null,
            "Карточка с таким id в Kaiten не найдена (проверьте id в URL Kaiten)",
          ),
        },
        { status: 502 },
      );
    }
    const cardObj = cr.card as Record<string, unknown>;
    const boardIdRaw = cardObj.board_id;
    const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
    if (boardId == null) {
      return NextResponse.json(
        { error: "В карточке Kaiten нет board_id" },
        { status: 502 },
      );
    }
    const cols = await kaitenListBoardColumns(auth, boardId, burst);
    if (!cols.ok) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            cols.status,
            cols.error,
            "Не удалось загрузить колонки доски",
          ),
        },
        { status: 502 },
      );
    }
    const trackLane = trackLaneForBoardId(
      boardId,
      cfg.boardByLane,
      existing.kaitenTrackLane,
    );
    const columnTitle = kaitenColumnTitleFromBoard(cardObj, cols.columns);
    const { blocked: kBlocked, reason: kBlockReason } =
      kaitenBlockStateFromCard(cardObj);
    const sort = kaitenSortOrderFromCard(cardObj);
    try {
      await ordersPrisma.order.update({
        where: { id: idTrim },
        data: {
          kaitenCardId: cardId,
          kaitenSyncError: null,
          kaitenSyncedAt: new Date(),
          ...(trackLane != null ? { kaitenTrackLane: trackLane } : {}),
          kaitenColumnTitle: columnTitle,
          kaitenBlocked: kBlocked,
          kaitenBlockReason: kBlockReason,
          kaitenCardSortOrder: sort,
          ...mirrorFieldsFromKaitenCard(cardObj),
        },
      });
    } catch (e) {
      console.error("[kaiten POST link]", e);
      return NextResponse.json(
        { error: "Не удалось сохранить привязку" },
        { status: 502 },
      );
    }
    invalidateKaitenSnapshotCache(idTrim);
    return NextResponse.json({ ok: true, kaitenCardId: cardId });
  }

  return NextResponse.json(
    { error: "Неизвестное action (ожидается create или link)" },
    { status: 400 },
  );
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const [ordersPrisma, clientsPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
  ]);
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) {
    return NextResponse.json(
      { error: "Kaiten не настроен" },
      { status: 503 },
    );
  }
  const cfg = await withResolvedKaitenBoards(cfg0);

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const order = await ordersPrisma.order.findUnique({
    where: { id: orderId.trim() },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (order.kaitenCardId == null) {
    return NextResponse.json({ error: "Нет карточки Kaiten" }, { status: 400 });
  }

  let resolvedColumnId: number | undefined;
  if (
    body.columnTitle != null &&
    typeof body.columnTitle === "string" &&
    body.columnId == null
  ) {
    const label = body.columnTitle.trim();
    if (label) {
      let boardId: number | null = null;
      if (body.kaitenTrackLane != null) {
        const lane = body.kaitenTrackLane;
        if (!TRACK_LANES.includes(lane)) {
          return NextResponse.json(
            { error: "Неизвестное пространство" },
            { status: 400 },
          );
        }
        const target = cfg.boardByLane[lane];
        if (!target || target.boardId == null) {
          return NextResponse.json(
            {
              error:
                "Это пространство не настроено в .env (нет доски/колонки)",
            },
            { status: 400 },
          );
        }
        boardId = target.boardId;
      } else {
        const cardRes = await kaitenGetCard(auth, order.kaitenCardId);
        if (!cardRes.ok || !cardRes.card) {
          return NextResponse.json(
            {
              error: friendlyKaitenLoadError(
                cardRes.status,
                cardRes.error,
                "Не удалось загрузить карточку Kaiten",
              ),
            },
            { status: 502 },
          );
        }
        const boardIdRaw = (cardRes.card as Record<string, unknown>).board_id;
        boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
        if (boardId == null) {
          return NextResponse.json(
            { error: "В карточке Kaiten нет board_id" },
            { status: 502 },
          );
        }
      }
      const cols = await kaitenListBoardColumns(auth, boardId);
      if (!cols.ok) {
        return NextResponse.json(
          {
            error: friendlyKaitenLoadError(
              cols.status,
              cols.error,
              "Не удалось загрузить колонки доски Kaiten",
            ),
          },
          { status: 502 },
        );
      }
      const match = findKaitenColumnIdByTitle(cols.columns, label);
      if (match == null) {
        return NextResponse.json(
          {
            error: `Колонка «${label}» не найдена на доске Kaiten (сверьте названия с колонками зеркала в CRM).`,
          },
          { status: 400 },
        );
      }
      resolvedColumnId = match;
    }
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length > 500) {
      return NextResponse.json({ error: "Слишком длинный заголовок" }, { status: 400 });
    }
    patch.title = t;
  }

  if (typeof body.description === "string") {
    const d = body.description;
    if (d.length > 400_000) {
      return NextResponse.json({ error: "Слишком длинное описание" }, { status: 400 });
    }
    patch.description = d;
  }

  if (body.kaitenTrackLane != null) {
    const lane = body.kaitenTrackLane;
    if (!TRACK_LANES.includes(lane)) {
      return NextResponse.json({ error: "Неизвестное пространство" }, { status: 400 });
    }
    const target = cfg.boardByLane[lane];
    if (!target || target.boardId == null) {
      return NextResponse.json(
        { error: "Это пространство не настроено в .env (нет доски/колонки)" },
        { status: 400 },
      );
    }
    patch.board_id = target.boardId;
    patch.column_id = target.columnToExecutionId;
    if (target.laneId != null) {
      patch.lane_id = target.laneId;
    } else {
      const lanes = await kaitenListBoardLanes(auth, target.boardId);
      if (!lanes.ok) {
        return NextResponse.json(
          {
            error: friendlyKaitenLoadError(
              lanes.status,
              lanes.error,
              "Не удалось получить дорожки доски Kaiten",
            ),
          },
          { status: 502 },
        );
      }
      patch.lane_id = lanes.lanes[0]?.id ?? null;
    }
  }

  const effectiveColumnId = body.columnId ?? resolvedColumnId;
  if (effectiveColumnId != null) {
    if (typeof effectiveColumnId !== "number" || !Number.isFinite(effectiveColumnId)) {
      return NextResponse.json({ error: "columnId" }, { status: 400 });
    }
    patch.column_id = effectiveColumnId;
  }

  if (body.laneId !== undefined) {
    if (body.laneId === null) {
      /* omit — не все инстансы принимают null */
    } else if (typeof body.laneId === "number" && Number.isFinite(body.laneId)) {
      patch.lane_id = body.laneId;
    } else {
      return NextResponse.json({ error: "laneId" }, { status: 400 });
    }
  }

  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    patch.sort_order = body.sortOrder;
  }

  if (body.kaitenCardTypeId !== undefined) {
    if (
      typeof body.kaitenCardTypeId === "string" &&
      body.kaitenCardTypeId.trim().length > 0
    ) {
      const kid = body.kaitenCardTypeId.trim();
      const kt = await clientsPrisma.kaitenCardType.findUnique({
        where: { id: kid },
        select: { externalTypeId: true },
      });
      if (!kt) {
        return NextResponse.json(
          { error: "Тип карточки не найден" },
          { status: 400 },
        );
      }
      patch.type_id = kt.externalTypeId;
    }
  }

  let blockTouched = false;
  if (typeof body.blocked === "boolean") {
    blockTouched = true;
    if (body.blocked) {
      const reason = normalizeKaitenBlockReasonInput(body.blockReason);
      if (!reason) {
        return NextResponse.json(
          { error: "Укажите причину блокировки (blockReason)" },
          { status: 400 },
        );
      }
      const post = await kaitenPostCardBlocker(auth, order.kaitenCardId, reason);
      if (!post.ok) {
        patch.blocked = true;
        patch.block_reason = reason;
      }
    } else {
      const released = await kaitenReleaseActiveCardBlockers(
        auth,
        order.kaitenCardId,
      );
      if (!released.ok) {
        patch.blocked = false;
      }
    }
  }

  const clearingOnlyCardType =
    body.kaitenCardTypeId !== undefined &&
    (body.kaitenCardTypeId === null ||
      (typeof body.kaitenCardTypeId === "string" && !body.kaitenCardTypeId.trim())) &&
    Object.keys(patch).length === 0 &&
    !blockTouched;

  if (Object.keys(patch).length === 0 && !blockTouched && !clearingOnlyCardType) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  let updated: {
    ok: boolean;
    card: Record<string, unknown> | null;
    error: string | null;
  } | null = null;

  if (Object.keys(patch).length > 0) {
    updated = await kaitenPatchCard(auth, order.kaitenCardId, patch);
    if (!updated.ok || !updated.card) {
      return NextResponse.json(
        { error: updated.error ?? "Kaiten не принял изменения" },
        { status: 502 },
      );
    }
  }

  if (blockTouched) {
    const fresh = await kaitenGetCard(auth, order.kaitenCardId);
    if (fresh.ok && fresh.card) {
      updated = { ok: true, card: fresh.card, error: null };
    } else if (!updated?.card) {
      return NextResponse.json(
        {
          error:
            fresh.error ??
            "Kaiten не вернул карточку после изменения блокировки",
        },
        { status: 502 },
      );
    }
  }

  if (!updated?.card && clearingOnlyCardType) {
    const fresh = await kaitenGetCard(auth, order.kaitenCardId);
    if (!fresh.ok || !fresh.card) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            fresh.status,
            fresh.error,
            "Kaiten не вернул карточку",
          ),
        },
        { status: 502 },
      );
    }
    updated = { ok: true, card: fresh.card, error: null };
  }

  if (!updated?.card) {
    return NextResponse.json(
      { error: "Нет данных карточки после запроса" },
      { status: 502 },
    );
  }

  const boardIdRaw = updated.card.board_id;
  const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
  let nextTrack: KaitenTrackLane | null | undefined;
  const preferLaneForBoard =
    body.kaitenTrackLane ?? order.kaitenTrackLane ?? null;
  if (boardId != null) {
    nextTrack = trackLaneForBoardId(
      boardId,
      cfg.boardByLane,
      preferLaneForBoard,
    );
  }

  const laneToStore: KaitenTrackLane | undefined =
    body.kaitenTrackLane != null
      ? body.kaitenTrackLane
      : nextTrack != null
        ? nextTrack
        : undefined;

  let titleUpdate: { kaitenColumnTitle: string | null } | undefined;
  if (boardId != null) {
    const colsAfter = await kaitenListBoardColumns(auth, boardId);
    if (colsAfter.ok) {
      titleUpdate = {
        kaitenColumnTitle: kaitenColumnTitleFromBoard(
          updated.card as Record<string, unknown>,
          colsAfter.columns,
        ),
      };
    }
  }

  const blockRow = blockFieldsForPrismaAfterPatch(
    body,
    updated.card as Record<string, unknown>,
  );

  try {
    await ordersPrisma.order.update({
      where: { id: order.id },
      data: {
        kaitenSyncedAt: new Date(),
        kaitenSyncError: null,
        ...(laneToStore != null ? { kaitenTrackLane: laneToStore } : {}),
        ...(titleUpdate ?? {}),
        ...mirrorFieldsFromKaitenCard(updated.card as Record<string, unknown>),
        ...(blockRow != null
          ? {
              kaitenBlocked: blockRow.kaitenBlocked,
              kaitenBlockReason: blockRow.kaitenBlockReason,
            }
          : {}),
        ...(body.kaitenCardTypeId !== undefined
          ? body.kaitenCardTypeId === null ||
            (typeof body.kaitenCardTypeId === "string" && !body.kaitenCardTypeId.trim())
            ? { kaitenCardType: { disconnect: true } }
            : {
                kaitenCardType: {
                  connect: { id: String(body.kaitenCardTypeId).trim() },
                },
              }
          : {}),
      },
    });
    try {
      await recordOrderRevision(orderId.trim(), { kind: "SAVE" });
    } catch (revErr) {
      console.error("[kaiten PATCH] revision log", revErr);
    }
  } catch (e) {
    console.error("[kaiten PATCH] prisma", e);
  }

  invalidateKaitenSnapshotCache(orderId.trim());

  return NextResponse.json({
    ok: true,
    card: updated.card,
    trackLane:
      boardId != null
        ? trackLaneForBoardId(
            boardId,
            cfg.boardByLane,
            laneToStore ?? preferLaneForBoard,
          )
        : undefined,
  });
}
