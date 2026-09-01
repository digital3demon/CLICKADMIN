import { NextResponse } from "next/server";
import { kanbanCardTypeNamesMatch } from "@/lib/kanban/kaiten-card-type-names";
import type { KaitenTrackLane, Prisma } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenEnvConfig, listConfiguredKaitenTrackLanes } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import {
  activeContinuationChildrenWhere,
  kaitenDescriptionWithContinuationPrefix,
  mapContinuationChildrenRefs,
} from "@/lib/order-continuation-display";
import {
  findKaitenColumnIdByTitle,
  kaitenColumnTitleFromBoard,
} from "@/lib/kaiten-column-title";
import {
  isKanbanStopColumnTitle,
  KANBAN_STOP_COLUMN_TITLE,
} from "@/lib/kanban/kanban-stop-column";
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
  kaitenBlockedMetaFromCard,
  normalizeKaitenBlockReasonInput,
} from "@/lib/kaiten-card-block";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { ingestKaitenCommentsForOrder } from "@/lib/kanban/kaiten-comments-ingest-server";
import { recordOrderRevision } from "@/lib/record-order-revision";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { pushKaitenCardTitleForOrderIfLinked } from "@/lib/kaiten-push-order-title";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import { kaitenUrgentPatchFromCard, kaitenMirrorFieldsFromCard } from "@/lib/kaiten-inbound-order-fields";
import {
  gateKaitenIntegration,
  kaitenIntegrationDisabledResponse,
} from "@/lib/kaiten-integration/guard";
import { kaitenDueDatePatchFromYmd } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { normalizeKanbanStageDueDate } from "@/lib/kanban/kanban-stage-due";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import {
  findKaitenStopLaneId,
  kaitenStopLaneIdFromEnv,
} from "@/lib/kaiten-stop-lane";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { restoreLinkedOrderFromStopIfParked } from "@/lib/kanban/advance-linked-order-column.server";

const TRACK_LANES: KaitenTrackLane[] = ["ORTHOPEDICS", "ORTHODONTICS", "TEST"];
const LEGACY_KAITEN_TYPE_NAME_BY_ID: Record<string, string> = {
  kt_vrem: "Временные",
  kt_mio: "МиоСплинт",
  kt_mod: "Модели",
  kt_nak: "Накладки",
  kt_nakmrt: "Накладки МРТ",
  kt_orto: "ОртоАппараты",
  kt_ortox: "ОртоАппараты x Хирургия",
  kt_post: "Постоянные",
  kt_spl: "Сплинт",
  kt_splmrt: "Сплинт МРТ",
  kt_hir: "Хирургия",
};

function legacyKaitenTypeName(id: string): string | null {
  const hit = LEGACY_KAITEN_TYPE_NAME_BY_ID[id];
  return typeof hit === "string" && hit.trim() ? hit.trim() : null;
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
  /**
   * CRM «В стоп»: перенести карточку на дорожку «СТОП» той же доски Kaiten
   * (у ортопедии / ортодонтии — своя дорожка). Несовместимо с явным laneId.
   */
  moveToStop?: boolean;
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
  /** Человекочитаемое имя типа (fallback при несовпадении id между канбаном и БД CRM). */
  kaitenCardTypeName?: string | null;
  /** Срок карточки канбана → Kaiten `due_date` (YYYY-MM-DD). Не лаб-срок и не дата записи. */
  stageDueDate?: string | null;
};

async function findTenantKaitenCardTypeByIdOrName(
  prisma: Awaited<ReturnType<typeof getClientsPrisma>>,
  tenantId: string,
  rawId: string,
  rawName?: string | null,
): Promise<{ id: string; externalTypeId: number } | null> {
  const id = String(rawId || "").trim();
  if (!id) return null;
  let row = await prisma.kaitenCardType.findFirst({
    where: { tenantId, id },
    select: { id: true, externalTypeId: true },
  });
  if (row) return row;
  const legacyName = legacyKaitenTypeName(id);
  if (legacyName) {
    row = await prisma.kaitenCardType.findFirst({
      where: { tenantId, name: legacyName },
      select: { id: true, externalTypeId: true },
    });
    if (row) return row;
  }
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) return null;
  const candidates = await prisma.kaitenCardType.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, externalTypeId: true },
  });
  const hit = candidates.find((x) => kanbanCardTypeNamesMatch(x.name, name));
  return hit ? { id: hit.id, externalTypeId: hit.externalTypeId } : null;
}

/**
 * Не перезаписывать блокировку в Prisma при PATCH без `blocked`: ответ Kaiten часто без
 * полей блокировки — разбор из карточки тогда даёт false и «снимает» блок в CRM.
 * При blocked: true, если в ответе карточки нет признака блока, берём причину из тела запроса.
 */
function blockFieldsForPrismaAfterPatch(
  body: PatchBody,
  card: Record<string, unknown>,
): {
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  kaitenBlockedAt: Date | null;
} | null {
  if (typeof body.blocked !== "boolean") return null;
  if (!body.blocked) {
    return {
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenBlockedAt: null,
    };
  }
  const meta = kaitenBlockedMetaFromCard(card);
  const requested = normalizeKaitenBlockReasonInput(body.blockReason);
  if (meta.blocked) {
    return {
      kaitenBlocked: true,
      kaitenBlockReason: requested ?? meta.reason,
      kaitenBlockedAt: meta.blockedAtIso
        ? new Date(meta.blockedAtIso)
        : new Date(),
    };
  }
  const reason = normalizeKaitenBlockReasonInput(body.blockReason);
  return {
    kaitenBlocked: true,
    kaitenBlockReason: reason,
    kaitenBlockedAt: new Date(),
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
  if (kaitenRateLimitMessage(status, raw)) {
    return "Слишком много запросов к Kaiten. Подождите 1–2 минуты и обновите страницу.";
  }
  const text = raw?.trim() || "";
  if (/Position inconsistency/i.test(text)) {
    return "Kaiten: колонка и дорожка не относятся к одной доске. Выберите дорожку из списка или снова откройте пространство и сохраните.";
  }
  return text || fallback;
}

/**
 * board/column/lane должны быть согласованы — иначе Kaiten: Position inconsistency.
 * Если lane не с доски или после смены пространства колонку переопределили без дорожки —
 * подставляем первую дорожку доски.
 */
async function reconcileKaitenPositionPatch(
  auth: NonNullable<ReturnType<typeof getKaitenRestAuth>>,
  cardId: number,
  patch: Record<string, unknown>,
  opts: {
    columnExplicit: boolean;
    laneExplicit: boolean;
    trackLaneChanged: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const needsPos =
    patch.board_id !== undefined ||
    patch.column_id !== undefined ||
    patch.lane_id !== undefined;
  if (!needsPos) return { ok: true };

  let boardId =
    typeof patch.board_id === "number" && Number.isFinite(patch.board_id)
      ? patch.board_id
      : null;

  let cardLane: number | null = null;
  if (boardId == null || (!opts.laneExplicit && patch.lane_id === undefined)) {
    const cardRes = await kaitenGetCard(auth, cardId);
    if (!cardRes.ok || !cardRes.card) {
      return {
        ok: false,
        error: friendlyKaitenLoadError(
          cardRes.status,
          cardRes.error,
          "Не удалось загрузить карточку Kaiten для проверки позиции",
        ),
      };
    }
    const card = cardRes.card as Record<string, unknown>;
    if (boardId == null) {
      const raw = card.board_id;
      boardId = typeof raw === "number" ? raw : null;
    }
    const ln = card.lane_id;
    cardLane = typeof ln === "number" ? ln : null;
  }
  if (boardId == null) return { ok: true };

  patch.board_id = boardId;

  const lanesRes = await kaitenListBoardLanes(auth, boardId, { burst: true });
  if (!lanesRes.ok) {
    return {
      ok: false,
      error: friendlyKaitenLoadError(
        lanesRes.status,
        lanesRes.error,
        "Не удалось получить дорожки доски Kaiten",
      ),
    };
  }
  const laneIds = new Set(lanesRes.lanes.map((l) => l.id));
  const firstLane = lanesRes.lanes[0]?.id ?? null;

  let lane: number | null =
    typeof patch.lane_id === "number" && Number.isFinite(patch.lane_id)
      ? patch.lane_id
      : null;
  if (lane == null && !opts.laneExplicit) {
    lane = cardLane;
  }

  if (opts.laneExplicit && lane != null && !laneIds.has(lane)) {
    return {
      ok: false,
      error:
        "Выбранная дорожка не принадлежит этой доске Kaiten. Обновите список и выберите снова.",
    };
  }

  const mustResetLane =
    lane == null ||
    !laneIds.has(lane) ||
    (opts.trackLaneChanged && opts.columnExplicit && !opts.laneExplicit);

  if (mustResetLane) {
    if (firstLane == null) {
      delete patch.lane_id;
    } else {
      patch.lane_id = firstLane;
    }
  } else if (typeof patch.column_id === "number" && lane != null) {
    /* Колонку двигаем — lane должен уйти в том же PATCH. */
    patch.lane_id = lane;
  }

  if (typeof patch.column_id === "number") {
    const cols = await kaitenListBoardColumns(auth, boardId, { burst: true });
    if (cols.ok) {
      const colOk = cols.columns.some((c) => c.id === patch.column_id);
      if (!colOk) {
        return {
          ok: false,
          error:
            "Выбранная колонка не принадлежит этой доске Kaiten. Снова выберите пространство и колонку.",
        };
      }
    }
  }

  return { ok: true };
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type KaitenChatImage = {
  id: string;
  name: string;
  url: string;
  mime: string | null;
  commentId: number | null;
};

function stringField(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberField(o: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function looksLikeImage(name: string, mime: string | null, url: string | null): boolean {
  if (mime?.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#].*)?$/i.test(name || url || "");
}

function kaitenImagesFromItems(
  items: unknown[],
  orderId: string,
  commentId: number | null,
): KaitenChatImage[] {
  const out: KaitenChatImage[] = [];
  for (const item of items) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const fileId = numberField(o, ["id", "file_id", "attachment_id"]);
    const name =
      stringField(o, ["name", "file_name", "filename", "title", "original_name"]) ??
      (fileId != null ? `image-${fileId}` : "image");
    const mime = stringField(o, ["mime_type", "mime", "content_type", "type"]);
    const directUrl = stringField(o, [
      "download_url",
      "url",
      "src",
      "preview_url",
      "thumbnail_url",
    ]);
    if (!looksLikeImage(name, mime, directUrl)) continue;
    const url =
      fileId != null
        ? `/api/orders/${encodeURIComponent(orderId)}/kaiten/files/${fileId}`
        : directUrl;
    if (!url) continue;
    out.push({
      id: `${commentId ?? "card"}-${fileId ?? url}`,
      name,
      url,
      mime,
      commentId,
    });
  }
  return out;
}

function kaitenImagesFromRecord(
  record: Record<string, unknown>,
  orderId: string,
  commentId: number | null,
): KaitenChatImage[] {
  const images: KaitenChatImage[] = [];
  for (const key of ["files", "attachments", "attached_files", "uploads"] as const) {
    const value = record[key];
    if (Array.isArray(value)) {
      images.push(...kaitenImagesFromItems(value, orderId, commentId));
    }
  }
  return images;
}

function dedupeKaitenImages(images: KaitenChatImage[]): KaitenChatImage[] {
  const seen = new Set<string>();
  const out: KaitenChatImage[] = [];
  for (const image of images) {
    const key = image.url || image.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(image);
  }
  return out;
}

/** 5xx / обрыв на стороне Kaiten — пригодно для 2–3 повторов, не 429. */
function isTransientKaitenHttpStatus(status: number): boolean {
  if (status === 429) return false;
  if (status >= 500 && status < 600) return true;
  return false;
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
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const gateGet = await gateKaitenIntegration(ordersPrisma, tenantId);
  if (!gateGet.ok) return kaitenIntegrationDisabledResponse(gateGet);

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

  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
      isUrgent: true,
      kaitenCardTitleMirror: true,
      kaitenCardDescriptionMirror: true,
      kaitenCardTitleManual: true,
      kaitenCardDescriptionManual: true,
      kaitenSyncedAt: true,
      kaitenColumnTitle: true,
      tenant: { select: { kanbanAdminMentionTag: true } },
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

  const cardObj = cardRes.card as Record<string, unknown>;
  const parsedComments = comm.comments
    .map((raw) => {
      const parsed = parseKaitenListComment(raw);
      if (!parsed) return null;
      const images =
        raw != null && typeof raw === "object" && !Array.isArray(raw)
          ? kaitenImagesFromRecord(
              raw as Record<string, unknown>,
              orderIdTrim,
              parsed.id,
            )
          : [];
      return { ...parsed, images };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  const comments = dedupeParsedKaitenComments(parsedComments);
  const cardImages = dedupeKaitenImages([
    ...kaitenImagesFromRecord(cardObj, orderIdTrim, null),
    ...comments.flatMap((c) => c.images || []),
  ]);
  const payload = {
    configured: true,
    card: cardRes.card,
    trackLane,
    orderTrackLane: order.kaitenTrackLane,
    columns: cols.columns,
    lanes: lns.lanes,
    comments,
    cardImages,
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
      await ingestKaitenCommentsForOrder({
        prisma: ordersPrisma,
        tenantId,
        orderId: orderIdTrim,
        parsed: comments,
        kanbanAdminMentionTag: order.tenant?.kanbanAdminMentionTag,
      });
    } catch (e) {
      console.error("[kaiten GET] ingest (deferred)", e);
    }
    try {
      const mirrorFields = kaitenMirrorFieldsFromCard(cardObj);
      await ordersPrisma.order.update({
        where: { id: orderIdTrim },
        data: {
          ...(mirrorFields.kaitenCardDescriptionMirror !== undefined
            ? { kaitenCardDescriptionMirror: mirrorFields.kaitenCardDescriptionMirror }
            : {}),
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
      kaitenCardTypeName?: string | null;
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
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const gatePost = await gateKaitenIntegration(ordersPrisma, tenantId);
  if (!gatePost.ok) return kaitenIntegrationDisabledResponse(gatePost);

  let body: KaitenPostBody;
  try {
    body = (await req.json()) as KaitenPostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const idTrim = orderId.trim();
  const existing = await ordersPrisma.order.findFirst({
    where: { id: idTrim, tenantId },
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
      title?: string;
      kaitenTrackLane?: KaitenTrackLane;
      kaitenCardTypeId?: string | null;
      kaitenCardTypeName?: string | null;
      columnId?: number;
    };
    const createTitle =
      typeof b.title === "string" && b.title.trim().length > 0
        ? b.title.trim().slice(0, 500)
        : null;

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
        const kt = await findTenantKaitenCardTypeByIdOrName(
          clientsPrisma,
          tenantId,
          kid,
          b.kaitenCardTypeName,
        );
        if (!kt) {
          return NextResponse.json(
            { error: "Тип карточки Kaiten не найден" },
            { status: 400 },
          );
        }
        data.kaitenCardType = { connect: { id: kt.id } };
      }
    }
    const laneAfter =
      b.kaitenTrackLane != null ? b.kaitenTrackLane : existing.kaitenTrackLane;
    let typeIdAfter: string | null = existing.kaitenCardTypeId ?? null;
    if (b.kaitenCardTypeId !== undefined) {
      if (b.kaitenCardTypeId === null || b.kaitenCardTypeId === "") {
        typeIdAfter = null;
      } else {
        const kid = String(b.kaitenCardTypeId).trim();
        const kt = await findTenantKaitenCardTypeByIdOrName(
          clientsPrisma,
          tenantId,
          kid,
          b.kaitenCardTypeName,
        );
        typeIdAfter = kt?.id ?? kid;
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
      const ord = await ordersPrisma.order.findFirst({
        where: { id: idTrim, tenantId },
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
      try {
        await pushKaitenCardTitleForOrderIfLinked(idTrim);
      } catch (e) {
        console.error("[kaiten POST create] push head after create", e);
      }
      if (createTitle && result.kaitenCardId) {
        const auth = getKaitenRestAuth();
        if (auth) {
          const titlePatch = await kaitenPatchCard(
            auth,
            result.kaitenCardId,
            { title: createTitle },
            { burst: true } as const,
          );
          if (!titlePatch.ok) {
            console.warn("[kaiten POST create] title patch failed", titlePatch.error);
          }
        }
      }
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
    const linkBlockMeta = kaitenBlockedMetaFromCard(cardObj);
    const kBlocked = linkBlockMeta.blocked;
    const kBlockReason = linkBlockMeta.reason;
    const sort = kaitenSortOrderFromCard(cardObj);
    const linkBlockedAtPatch =
      !kBlocked
        ? { kaitenBlockedAt: null as Date | null }
        : linkBlockMeta.blockedAtIso
          ? { kaitenBlockedAt: new Date(linkBlockMeta.blockedAtIso) }
          : {};
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
          ...linkBlockedAtPatch,
          kaitenCardSortOrder: sort,
        },
      });
    } catch (e) {
      console.error("[kaiten POST link]", e);
      return NextResponse.json(
        { error: "Не удалось сохранить привязку" },
        { status: 502 },
      );
    }
    try {
      await pushKaitenCardTitleForOrderIfLinked(idTrim);
    } catch (e) {
      console.error("[kaiten POST link] push head after link", e);
    }
    invalidateKaitenSnapshotCache(idTrim);
    try {
      await syncUnpushedOrderAttachmentsToKaiten(idTrim, ordersPrisma);
    } catch (e) {
      console.error("[kaiten POST link] syncUnpushed", e);
    }
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
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const gatePatch = await gateKaitenIntegration(ordersPrisma, tenantId);
  if (!gatePatch.ok) return kaitenIntegrationDisabledResponse(gatePatch);

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

  const moduleAccess = session
    ? await getEffectiveModuleAccess(tenantId, session.role)
    : null;
  const canMove = moduleAccess?.KANBAN_MOVE_COLUMNS === true;
  const canStop = moduleAccess?.KANBAN_STOP === true || canMove;
  const canRestoreFromStop =
    moduleAccess?.KANBAN === true || canStop;
  const canOtherBoard =
    moduleAccess?.KANBAN_MOVE_TO_OTHER_BOARD === true || canMove;
  if (body.moveToStop === true && !canStop) {
    return NextResponse.json({ error: "Нет права СТОП" }, { status: 403 });
  }
  if (body.kaitenTrackLane != null && !canOtherBoard) {
    return NextResponse.json(
      { error: "Нет права переносить на другую доску" },
      { status: 403 },
    );
  }

  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenTrackLane: true,
      kaitenColumnTitle: true,
      isUrgent: true,
      kaitenCardTitleMirror: true,
      kaitenCardDescriptionMirror: true,
      kaitenCardTitleManual: true,
      kaitenCardDescriptionManual: true,
      continuesFromOrder: {
        select: {
          orderNumber: true,
          kaitenCardId: true,
        },
      },
      continuationOrders: {
        where: activeContinuationChildrenWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          kaitenCardId: true,
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  const leavingStop =
    isKanbanStopColumnTitle(order.kaitenColumnTitle) &&
    body.moveToStop !== true &&
    (body.columnId != null ||
      (typeof body.columnTitle === "string" &&
        body.columnTitle.trim() !== "" &&
        !isKanbanStopColumnTitle(body.columnTitle)));
  if (
    (body.columnTitle != null ||
      body.columnId != null ||
      body.sortOrder != null ||
      body.laneId != null) &&
    !canMove &&
    body.moveToStop !== true &&
    !(body.kaitenTrackLane != null && canOtherBoard) &&
    !leavingStop
  ) {
    return NextResponse.json(
      { error: "Нет права перемещать по колонкам" },
      { status: 403 },
    );
  }
  if (leavingStop && !canRestoreFromStop) {
    return NextResponse.json(
      { error: "Нет права вернуть карточку из СТОП" },
      { status: 403 },
    );
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
    const d = kaitenDescriptionWithContinuationPrefix(
      body.description,
      order.continuesFromOrder
        ? {
            orderNumber: order.continuesFromOrder.orderNumber,
            kaitenCardId: order.continuesFromOrder.kaitenCardId,
          }
        : null,
      mapContinuationChildrenRefs(order.continuationOrders),
    );
    if (d.length > 400_000) {
      return NextResponse.json({ error: "Слишком длинное описание" }, { status: 400 });
    }
    patch.description = d;
  }

  if (body.moveToStop === true) {
    if (body.laneId !== undefined) {
      return NextResponse.json(
        { error: "Нельзя одновременно moveToStop и laneId" },
        { status: 400 },
      );
    }
    if (body.kaitenTrackLane != null) {
      return NextResponse.json(
        { error: "Нельзя одновременно moveToStop и смену пространства" },
        { status: 400 },
      );
    }
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

  if (body.moveToStop === true) {
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
    const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
    if (boardId == null) {
      return NextResponse.json(
        { error: "В карточке Kaiten нет board_id" },
        { status: 502 },
      );
    }
    const trackHint = trackLaneForBoardId(
      boardId,
      cfg.boardByLane,
      order.kaitenTrackLane,
    );
    let stopLaneId = kaitenStopLaneIdFromEnv(trackHint);
    if (stopLaneId == null) {
      const lanes = await kaitenListBoardLanes(auth, boardId);
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
      stopLaneId = findKaitenStopLaneId(lanes.lanes);
    }
    if (stopLaneId == null) {
      return NextResponse.json(
        {
          error:
            "На доске Kaiten нет дорожки «СТОП». Добавьте lane с таким названием или задайте KAITEN_*_STOP_LANE_ID.",
        },
        { status: 400 },
      );
    }
    patch.lane_id = stopLaneId;
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

  if (body.stageDueDate !== undefined) {
    const raw = body.stageDueDate == null ? "" : String(body.stageDueDate).trim();
    const ymd = normalizeKanbanStageDueDate(raw);
    if (ymd && !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return NextResponse.json({ error: "Некорректный срок карточки" }, { status: 400 });
    }
    const duePatch = kaitenDueDatePatchFromYmd(ymd);
    patch.due_date = duePatch.due_date;
    patch.due_date_time_present = duePatch.due_date_time_present;
  }

  let resolvedKaitenCardTypeId: string | null | undefined;
  if (body.kaitenCardTypeId !== undefined) {
    if (
      typeof body.kaitenCardTypeId === "string" &&
      body.kaitenCardTypeId.trim().length > 0
    ) {
      const kid = body.kaitenCardTypeId.trim();
      const kt = await findTenantKaitenCardTypeByIdOrName(
        clientsPrisma,
        tenantId,
        kid,
        body.kaitenCardTypeName,
      );
      if (!kt) {
        return NextResponse.json(
          { error: "Тип карточки не найден" },
          { status: 400 },
        );
      }
      resolvedKaitenCardTypeId = kt.id;
      patch.type_id = kt.externalTypeId;
    } else {
      resolvedKaitenCardTypeId = null;
    }
  }

  let blockTouched = false;
  if (typeof body.blocked === "boolean") {
    blockTouched = true;
    const optimisticReason = body.blocked
      ? normalizeKaitenBlockReasonInput(body.blockReason)
      : null;
    if (body.blocked && !optimisticReason) {
      return NextResponse.json(
        { error: "Укажите причину блокировки (blockReason)" },
        { status: 400 },
      );
    }
    try {
      await ordersPrisma.order.update({
        where: { id: order.id },
        data: {
          kaitenBlocked: body.blocked,
          kaitenBlockReason: body.blocked ? optimisticReason : null,
          kaitenBlockedAt: body.blocked ? new Date() : null,
          kaitenSyncedAt: new Date(),
        },
      });
    } catch (e) {
      console.error("[kaiten PATCH] optimistic block prisma", e);
    }
    if (body.blocked) {
      const reason = optimisticReason!;
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

  if (Object.keys(patch).length > 0) {
    const reconciled = await reconcileKaitenPositionPatch(
      auth,
      order.kaitenCardId,
      patch,
      {
        columnExplicit: body.columnId != null || resolvedColumnId != null,
        laneExplicit: body.laneId !== undefined && body.laneId !== null,
        trackLaneChanged: body.kaitenTrackLane != null,
      },
    );
    if (!reconciled.ok) {
      return NextResponse.json({ error: reconciled.error }, { status: 400 });
    }
  }

  let updated: {
    ok: boolean;
    card: Record<string, unknown> | null;
    error: string | null;
  } | null = null;

  if (Object.keys(patch).length > 0) {
    updated = await kaitenPatchCard(auth, order.kaitenCardId, patch, {
      burst: true,
    });
    if (!updated.ok || !updated.card) {
      return NextResponse.json(
        {
          error: friendlyKaitenLoadError(
            502,
            updated.error,
            "Kaiten не принял изменения",
          ),
        },
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
  if (body.moveToStop === true) {
    titleUpdate = { kaitenColumnTitle: KANBAN_STOP_COLUMN_TITLE };
  } else if (
    isKanbanStopColumnTitle(order.kaitenColumnTitle) &&
    body.columnId == null
  ) {
    titleUpdate = { kaitenColumnTitle: KANBAN_STOP_COLUMN_TITLE };
  } else if (boardId != null) {
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
  const mirrorFields = kaitenMirrorFieldsFromCard(
    updated.card as Record<string, unknown>,
  );
  const descriptionMirrorPatch =
    typeof body.description === "string"
      ? {
          kaitenCardDescriptionMirror:
            kaitenDescriptionWithContinuationPrefix(
              body.description.trim(),
              order.continuesFromOrder
                ? {
                    orderNumber: order.continuesFromOrder.orderNumber,
                    kaitenCardId: order.continuesFromOrder.kaitenCardId,
                  }
                : null,
              mapContinuationChildrenRefs(order.continuationOrders),
            ).trim() || null,
        }
      : mirrorFields.kaitenCardDescriptionMirror !== undefined
        ? { kaitenCardDescriptionMirror: mirrorFields.kaitenCardDescriptionMirror }
        : {};

  const titleMirrorPatch =
    typeof body.title === "string"
      ? {
          kaitenCardTitleMirror: body.title.trim() || null,
          kaitenCardTitleManual: true,
        }
      : mirrorFields.kaitenCardTitleMirror !== undefined
        ? { kaitenCardTitleMirror: mirrorFields.kaitenCardTitleMirror }
        : {};

  try {
    const cardObj = updated.card as Record<string, unknown>;
    const sortPatch =
      "sort_order" in cardObj
        ? { kaitenCardSortOrder: kaitenSortOrderFromCard(cardObj) }
        : {};

    await ordersPrisma.order.update({
      where: { id: order.id },
      data: {
        kaitenSyncedAt: new Date(),
        kaitenSyncError: null,
        ...(laneToStore != null ? { kaitenTrackLane: laneToStore } : {}),
        ...(titleUpdate ?? {}),
        ...titleMirrorPatch,
        ...descriptionMirrorPatch,
        ...sortPatch,
        ...kaitenUrgentPatchFromCard(cardObj, order.isUrgent),
        ...(blockRow != null
          ? {
              kaitenBlocked: blockRow.kaitenBlocked,
              kaitenBlockReason: blockRow.kaitenBlockReason,
              kaitenBlockedAt: blockRow.kaitenBlockedAt,
            }
          : {}),
        ...(body.kaitenCardTypeId !== undefined
          ? resolvedKaitenCardTypeId == null
            ? { kaitenCardType: { disconnect: true } }
            : { kaitenCardType: { connect: { id: resolvedKaitenCardTypeId } } }
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

  const nextColumnTitle = titleUpdate?.kaitenColumnTitle ?? null;
  if (
    body.moveToStop !== true &&
    nextColumnTitle &&
    !isKanbanStopColumnTitle(nextColumnTitle)
  ) {
    try {
      await restoreLinkedOrderFromStopIfParked({
        tenantId,
        orderId: order.id,
        columnTitle: nextColumnTitle,
        actorUserId: session?.sub ?? null,
        actorLabel: session?.name ?? null,
      });
    } catch (stopErr) {
      console.error("[kaiten PATCH] restore from stop", stopErr);
    }
  }

  invalidateKaitenSnapshotCache(orderId.trim());

  if (body.kaitenCardTypeId !== undefined) {
    try {
      await pushKaitenCardTitleForOrderIfLinked(orderId.trim());
    } catch (e) {
      console.error("[kaiten PATCH] title push after type change", e);
    }
  }

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
