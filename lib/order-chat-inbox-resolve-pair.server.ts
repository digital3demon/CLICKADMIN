import type { PrismaClient } from "@prisma/client";
import { stripOrderChatCorrectionPrefix } from "@/lib/order-chat-correction";

type CloseAction = "accept" | "reject";

type PairRow = {
  id: string;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  kaitenCommentId: number | null;
};

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
      select: { id: true },
    });
    for (const t of textTwinLegacy) legacyIds.add(t.id);

    const textTwinInbox = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "CORRECTION",
        text: { in: textVariants },
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of textTwinInbox) inboxIds.add(t.id);
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
      resolvedAt: true,
      rejectedAt: true,
      kaitenCommentId: true,
    },
  })) as PairRow | null;

  const legacyRow = (await db.orderProstheticsRequest.findFirst({
    where: { id: rid, orderId: oid },
    select: {
      id: true,
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
  arrivedAt: Date | null;
};

/**
 * Отмечает «пришла» / снимает отметку у заявки протетики (inbox + legacy близнецы).
 * Только для уже принятых (resolved) и не отклонённых.
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
      resolvedAt: true,
      rejectedAt: true,
      arrivedAt: true,
      kaitenCommentId: true,
    },
  })) as ArrivedPairRow | null;

  const legacyRow = (await db.orderProstheticsRequest.findFirst({
    where: { id: rid, orderId: oid },
    select: {
      id: true,
      resolvedAt: true,
      rejectedAt: true,
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
      error: "Сначала примите заявку (протетика в пути)",
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
