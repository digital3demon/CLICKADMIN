import type { PrismaClient } from "@prisma/client";
import { stripOrderChatCorrectionPrefix } from "@/lib/order-chat-correction";
import {
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import {
  canAdvanceProstheticsProgressStep,
  type ProstheticsProgressStep,
} from "@/lib/prosthetics-in-transit-step";
import { areChatRequestCreatedTwins } from "@/lib/order-chat-request-twin";

type CloseAction = "accept" | "reject";

type PairRow = {
  id: string;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  kaitenCommentId: number | null;
  text?: string | null;
  createdAt?: Date | null;
};

function prostheticsTwinKey(raw: string): string {
  return normalizeProstheticsTwinKey(
    stripOrderProstheticsRequestPrefix(raw)?.trim() || raw,
  );
}

async function addProstheticsTextTwins(
  db: PrismaClient,
  orderId: string,
  primaryText: string,
  primaryCreatedAt: Date | null | undefined,
  inboxIds: Set<string>,
  legacyIds: Set<string>,
  extraInbox: Record<string, unknown>,
  extraLegacy: Record<string, unknown>,
): Promise<void> {
  const key = prostheticsTwinKey(primaryText);
  if (!key || !primaryCreatedAt) return;

  const inboxRows = (await (db as any).orderChatInboxItem.findMany({
    where: { orderId, type: "PROSTHETICS", ...extraInbox },
    select: { id: true, text: true, createdAt: true },
    take: 80,
  })) as Array<{ id: string; text: string; createdAt: Date }>;
  for (const row of inboxRows) {
    if (
      prostheticsTwinKey(row.text) === key &&
      areChatRequestCreatedTwins(row.createdAt, primaryCreatedAt)
    ) {
      inboxIds.add(row.id);
    }
  }

  const legacyRows = await db.orderProstheticsRequest.findMany({
    where: { orderId, ...extraLegacy },
    select: { id: true, text: true, createdAt: true },
    take: 80,
  });
  for (const row of legacyRows) {
    if (
      prostheticsTwinKey(row.text) === key &&
      areChatRequestCreatedTwins(row.createdAt, primaryCreatedAt)
    ) {
      legacyIds.add(row.id);
    }
  }
}

function closeData(action: CloseAction, userId: string) {
  const now = new Date();
  if (action === "accept") {
    return { resolvedAt: now, resolvedByUserId: userId };
  }
  return { rejectedAt: now, rejectedByUserId: userId };
}

function reopenData(action: CloseAction) {
  if (action === "accept") {
    return { resolvedAt: null, resolvedByUserId: null };
  }
  return { rejectedAt: null, rejectedByUserId: null };
}

export type ClosePairResult =
  | { ok: true; inboxIds: string[]; legacyIds: string[] }
  | {
      ok: false;
      status: 404 | 409;
      error: string;
    };

/**
 * Закрывает корректировку в inbox и legacy (близнецы по kaitenCommentId).
 * Иначе список держит отметку по незакрытому близнецу с другим id.
 */
export async function closeOrderChatCorrectionPair(
  db: PrismaClient,
  orderId: string,
  correctionId: string,
  action: CloseAction,
  userId: string,
): Promise<ClosePairResult> {
  const oid = orderId.trim();
  const cid = correctionId.trim();
  const inboxRow = (await (db as any).orderChatInboxItem.findFirst({
    where: { id: cid, orderId: oid, type: "CORRECTION" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      kaitenCommentId: true,
    },
  })) as (PairRow & { text: string }) | null;

  const legacyRow = (await db.orderChatCorrection.findFirst({
    where: { id: cid, orderId: oid },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      kaitenCommentId: true,
    },
  })) as (PairRow & { text: string }) | null;

  const primary = inboxRow ?? legacyRow;
  if (!primary) {
    return { ok: false, status: 404, error: "Запись не найдена" };
  }
  if (primary.resolvedAt != null) {
    return {
      ok: false,
      status: 409,
      error: "Уже принято",
    };
  }
  if (primary.rejectedAt != null) {
    return {
      ok: false,
      status: 409,
      error: action === "reject" ? "Уже отклонено" : "Корректировка отклонена",
    };
  }

  const kaitenCommentId =
    inboxRow?.kaitenCommentId ?? legacyRow?.kaitenCommentId ?? null;
  const primaryText = String(primary.text || "").trim();
  const data = closeData(action, userId);

  const inboxIds = new Set<string>();
  const legacyIds = new Set<string>();

  if (inboxRow) inboxIds.add(inboxRow.id);
  if (legacyRow) legacyIds.add(legacyRow.id);

  if (kaitenCommentId != null) {
    const twinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "CORRECTION",
        kaitenCommentId,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of twinInbox) inboxIds.add(t.id);

    const twinLegacy = await db.orderChatCorrection.findMany({
      where: {
        orderId: oid,
        kaitenCommentId,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    });
    for (const t of twinLegacy) legacyIds.add(t.id);
  }

  // CRM DEMO_KANBAN без kid + Kaiten с kid — один текст, разные id.
  if (primaryText) {
    const stripped =
      stripOrderChatCorrectionPrefix(primaryText)?.trim() || primaryText;
    const textVariants = [...new Set([primaryText, stripped, `!!! ${stripped}`])];
    const textTwinLegacy = await db.orderChatCorrection.findMany({
      where: {
        orderId: oid,
        text: { in: textVariants },
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true, createdAt: true },
    });
    for (const t of textTwinLegacy) {
      if (areChatRequestCreatedTwins(t.createdAt, primary.createdAt)) {
        legacyIds.add(t.id);
      }
    }

    const textTwinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "CORRECTION",
        text: { in: textVariants },
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true, createdAt: true },
    })) as Array<{ id: string; createdAt: Date }>;
    for (const t of textTwinInbox) {
      if (areChatRequestCreatedTwins(t.createdAt, primary.createdAt)) {
        inboxIds.add(t.id);
      }
    }
  }

  for (const id of inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of legacyIds) {
    await db.orderChatCorrection.update({
      where: { id },
      data,
    });
  }

  return {
    ok: true,
    inboxIds: [...inboxIds],
    legacyIds: [...legacyIds],
  };
}

export async function reopenOrderChatCorrectionPair(
  db: PrismaClient,
  pair: { inboxIds: string[]; legacyIds: string[] },
  action: CloseAction,
): Promise<void> {
  const data = reopenData(action);
  for (const id of pair.inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of pair.legacyIds) {
    await db.orderChatCorrection.update({
      where: { id },
      data,
    });
  }
}

/**
 * Закрывает заявку протетики в inbox и legacy (близнецы по kaitenCommentId).
 */
export async function closeOrderProstheticsRequestPair(
  db: PrismaClient,
  orderId: string,
  requestId: string,
  action: CloseAction,
  userId: string,
): Promise<ClosePairResult> {
  const oid = orderId.trim();
  const rid = requestId.trim();
  const inboxRow = (await (db as any).orderChatInboxItem.findFirst({
    where: { id: rid, orderId: oid, type: "PROSTHETICS" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      kaitenCommentId: true,
    },
  })) as PairRow | null;

  const legacyRow = (await db.orderProstheticsRequest.findFirst({
    where: { id: rid, orderId: oid },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      kaitenCommentId: true,
    },
  })) as PairRow | null;

  const primary = inboxRow ?? legacyRow;
  if (!primary) {
    return { ok: false, status: 404, error: "Запись не найдена" };
  }
  if (primary.resolvedAt != null) {
    return {
      ok: false,
      status: 409,
      error: "Уже принято",
    };
  }
  if (primary.rejectedAt != null) {
    return {
      ok: false,
      status: 409,
      error: action === "reject" ? "Уже отклонено" : "Заявка отклонена",
    };
  }

  const kaitenCommentId =
    inboxRow?.kaitenCommentId ?? legacyRow?.kaitenCommentId ?? null;
  const data = closeData(action, userId);

  const inboxIds = new Set<string>();
  const legacyIds = new Set<string>();

  if (inboxRow) inboxIds.add(inboxRow.id);
  if (legacyRow) legacyIds.add(legacyRow.id);

  if (kaitenCommentId != null) {
    const twinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "PROSTHETICS",
        kaitenCommentId,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of twinInbox) inboxIds.add(t.id);

    const twinLegacy = await db.orderProstheticsRequest.findMany({
      where: {
        orderId: oid,
        kaitenCommentId,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    });
    for (const t of twinLegacy) legacyIds.add(t.id);
  }

  const primaryText = String(inboxRow?.text || legacyRow?.text || "").trim();
  await addProstheticsTextTwins(
    db,
    oid,
    primaryText,
    inboxRow?.createdAt ?? legacyRow?.createdAt,
    inboxIds,
    legacyIds,
    { resolvedAt: null, rejectedAt: null },
    { resolvedAt: null, rejectedAt: null },
  );

  for (const id of inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of legacyIds) {
    await db.orderProstheticsRequest.update({
      where: { id },
      data,
    });
  }

  return {
    ok: true,
    inboxIds: [...inboxIds],
    legacyIds: [...legacyIds],
  };
}

export async function reopenOrderProstheticsRequestPair(
  db: PrismaClient,
  pair: { inboxIds: string[]; legacyIds: string[] },
  action: CloseAction,
): Promise<void> {
  const data = reopenData(action);
  for (const id of pair.inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of pair.legacyIds) {
    await db.orderProstheticsRequest.update({
      where: { id },
      data,
    });
  }
}

type ArrivedPairRow = PairRow & {
  orderedAt: Date | null;
  arrivedAt: Date | null;
};

/**
 * Отмечает «пришла» / снимает отметку у заявки протетики (inbox + legacy близнецы).
 * Только после «Заказал» (orderedAt) и не отклонённых.
 */
export async function setOrderProstheticsArrivedPair(
  db: PrismaClient,
  orderId: string,
  requestId: string,
  arrived: boolean,
  userId: string,
): Promise<ClosePairResult> {
  const oid = orderId.trim();
  const rid = requestId.trim();
  const inboxRow = (await (db as any).orderChatInboxItem.findFirst({
    where: { id: rid, orderId: oid, type: "PROSTHETICS" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      orderedAt: true,
      arrivedAt: true,
      kaitenCommentId: true,
    },
  })) as ArrivedPairRow | null;

  const legacyRow = (await db.orderProstheticsRequest.findFirst({
    where: { id: rid, orderId: oid },
    select: {
      id: true,
      text: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
      orderedAt: true,
      arrivedAt: true,
      kaitenCommentId: true,
    },
  })) as ArrivedPairRow | null;

  const primary = inboxRow ?? legacyRow;
  if (!primary) {
    return { ok: false, status: 404, error: "Запись не найдена" };
  }
  if (primary.rejectedAt != null) {
    return { ok: false, status: 409, error: "Заявка отклонена" };
  }
  if (primary.resolvedAt == null) {
    return {
      ok: false,
      status: 409,
      error: "Сначала подтвердите заявку",
    };
  }
  if (arrived && primary.orderedAt == null) {
    return {
      ok: false,
      status: 409,
      error: "Сначала отметьте «заказал»",
    };
  }
  if (arrived && primary.arrivedAt != null) {
    return { ok: false, status: 409, error: "Уже отмечено «пришла»" };
  }
  if (!arrived && primary.arrivedAt == null) {
    return { ok: false, status: 409, error: "Отметка «пришла» уже снята" };
  }

  const kaitenCommentId =
    inboxRow?.kaitenCommentId ?? legacyRow?.kaitenCommentId ?? null;
  const data = arrived
    ? { arrivedAt: new Date(), arrivedByUserId: userId }
    : { arrivedAt: null, arrivedByUserId: null };

  const inboxIds = new Set<string>();
  const legacyIds = new Set<string>();

  if (inboxRow) inboxIds.add(inboxRow.id);
  if (legacyRow) legacyIds.add(legacyRow.id);

  if (kaitenCommentId != null) {
    const twinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "PROSTHETICS",
        kaitenCommentId,
        resolvedAt: { not: null },
        rejectedAt: null,
        ...(arrived ? { arrivedAt: null } : { arrivedAt: { not: null } }),
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of twinInbox) inboxIds.add(t.id);

    const twinLegacy = await db.orderProstheticsRequest.findMany({
      where: {
        orderId: oid,
        kaitenCommentId,
        resolvedAt: { not: null },
        rejectedAt: null,
        ...(arrived ? { arrivedAt: null } : { arrivedAt: { not: null } }),
      },
      select: { id: true },
    });
    for (const t of twinLegacy) legacyIds.add(t.id);
  }

  const arrivedTwinWhere = {
    resolvedAt: { not: null },
    rejectedAt: null,
    ...(arrived ? { arrivedAt: null } : { arrivedAt: { not: null } }),
  };
  await addProstheticsTextTwins(
    db,
    oid,
    String(inboxRow?.text || legacyRow?.text || "").trim(),
    inboxRow?.createdAt ?? legacyRow?.createdAt,
    inboxIds,
    legacyIds,
    arrivedTwinWhere,
    arrivedTwinWhere,
  );

  for (const id of inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of legacyIds) {
    await db.orderProstheticsRequest.update({
      where: { id },
      data,
    });
  }

  return {
    ok: true,
    inboxIds: [...inboxIds],
    legacyIds: [...legacyIds],
  };
}

type ProgressPairRow = PairRow & {
  orderedAt: Date | null;
  arrivedAt: Date | null;
  checkedAt: Date | null;
  completedAt: Date | null;
};

const progressSelect = {
  id: true,
  text: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  orderedAt: true,
  arrivedAt: true,
  checkedAt: true,
  completedAt: true,
  kaitenCommentId: true,
} as const;

/**
 * Продвигает степпер протетики (ordered / arrived / checked / completed) на inbox + legacy.
 * arrived делегирует в setOrderProstheticsArrivedPair.
 */
export async function advanceOrderProstheticsProgressPair(
  db: PrismaClient,
  orderId: string,
  requestId: string,
  step: ProstheticsProgressStep,
  userId: string,
): Promise<ClosePairResult> {
  if (step === "arrived") {
    return setOrderProstheticsArrivedPair(db, orderId, requestId, true, userId);
  }

  const oid = orderId.trim();
  const rid = requestId.trim();
  const inboxRow = (await (db as any).orderChatInboxItem.findFirst({
    where: { id: rid, orderId: oid, type: "PROSTHETICS" },
    select: progressSelect,
  })) as ProgressPairRow | null;

  const legacyRow = (await db.orderProstheticsRequest.findFirst({
    where: { id: rid, orderId: oid },
    select: progressSelect,
  })) as ProgressPairRow | null;

  const primary = inboxRow ?? legacyRow;
  if (!primary) {
    return { ok: false, status: 404, error: "Запись не найдена" };
  }
  if (primary.rejectedAt != null) {
    return { ok: false, status: 409, error: "Заявка отклонена" };
  }

  const gate = canAdvanceProstheticsProgressStep(
    {
      resolvedAt: primary.resolvedAt,
      orderedAt: primary.orderedAt,
      arrivedAt: primary.arrivedAt,
      checkedAt: primary.checkedAt,
      completedAt: primary.completedAt,
    },
    step,
  );
  if (!gate.ok) {
    return { ok: false, status: 409, error: gate.error };
  }

  const now = new Date();
  /* Подтвердил → Заказал → Пришла → Проверил → Готово — отдельные клики. */
  const data =
    step === "ordered"
      ? {
          orderedAt: now,
          orderedByUserId: userId,
        }
      : step === "checked"
        ? {
            checkedAt: now,
            checkedByUserId: userId,
          }
        : { completedAt: now, completedByUserId: userId };

  const kaitenCommentId =
    inboxRow?.kaitenCommentId ?? legacyRow?.kaitenCommentId ?? null;
  const inboxIds = new Set<string>();
  const legacyIds = new Set<string>();

  if (inboxRow) inboxIds.add(inboxRow.id);
  if (legacyRow) legacyIds.add(legacyRow.id);

  const twinFilter =
    step === "ordered"
      ? {
          orderedAt: null,
          arrivedAt: null,
          checkedAt: null,
          completedAt: null,
        }
      : step === "checked"
        ? {
            arrivedAt: { not: null },
            checkedAt: null,
            completedAt: null,
          }
        : {
            checkedAt: { not: null },
            completedAt: null,
          };

  if (kaitenCommentId != null) {
    const twinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "PROSTHETICS",
        kaitenCommentId,
        resolvedAt: { not: null },
        rejectedAt: null,
        ...twinFilter,
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of twinInbox) inboxIds.add(t.id);

    const twinLegacy = await db.orderProstheticsRequest.findMany({
      where: {
        orderId: oid,
        kaitenCommentId,
        resolvedAt: { not: null },
        rejectedAt: null,
        ...twinFilter,
      },
      select: { id: true },
    });
    for (const t of twinLegacy) legacyIds.add(t.id);
  }

  const progressTwinWhere = {
    resolvedAt: { not: null },
    rejectedAt: null,
    ...twinFilter,
  };
  await addProstheticsTextTwins(
    db,
    oid,
    String(inboxRow?.text || legacyRow?.text || "").trim(),
    inboxRow?.createdAt ?? legacyRow?.createdAt,
    inboxIds,
    legacyIds,
    progressTwinWhere,
    progressTwinWhere,
  );

  for (const id of inboxIds) {
    await (db as any).orderChatInboxItem.update({
      where: { id },
      data,
    });
  }
  for (const id of legacyIds) {
    await db.orderProstheticsRequest.update({
      where: { id },
      data,
    });
  }

  return {
    ok: true,
    inboxIds: [...inboxIds],
    legacyIds: [...legacyIds],
  };
}
