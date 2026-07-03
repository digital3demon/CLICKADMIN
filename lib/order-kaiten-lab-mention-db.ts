/**
 * Кэш «лабораторию упомянули в чате карточки»: вход — только **тексты** и тег тенанта.
 * Сейчас тексты приходят из API Kaiten; при отказе от Kaiten подставьте тексты из CRM-чата
 * (тот же `syncLabMentionFlagFromCommentTexts` / тот же `Order.kaitenChatHasLabMention`
 * или переименованное поле одной миграцией).
 */
import type { PrismaClient } from "@prisma/client";
import { textIncludesAdminLabMention } from "@/lib/kaiten-comment-parse";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";

function isMissingToastPreviewColumn(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const obj = err as { code?: string; meta?: { column?: string } };
  const col = obj.meta?.column ?? "";
  return (
    obj.code === "P2022" &&
    (col.includes("kaitenLabMentionToastAuthor") ||
      col.includes("kaitenLabMentionToastText"))
  );
}

/** Есть ли в текстах комментариев (Kaiten сейчас, позже — любой внешний/внутренний чат) упоминание тега лаборатории. */
export function computeKaitenLabMentionFromCommentTexts(
  commentTexts: readonly string[],
  kanbanAdminMentionTag: string | null | undefined,
): boolean {
  const labTag = normalizeKanbanAdminMentionTag(kanbanAdminMentionTag);
  return commentTexts.some((t) => textIncludesAdminLabMention(t, labTag));
}

/** Обновляет кэш `Order.kaitenChatHasLabMention`, если значение изменилось. */
export async function syncLabMentionFlagFromCommentTexts(
  db: PrismaClient,
  orderId: string,
  commentTexts: readonly string[],
  kanbanAdminMentionTag: string | null | undefined,
): Promise<boolean> {
  const computed = computeKaitenLabMentionFromCommentTexts(
    commentTexts,
    kanbanAdminMentionTag,
  );
  const row = await db.order.findUnique({
    where: { id: orderId },
    select: { kaitenChatHasLabMention: true },
  });
  if (!row || row.kaitenChatHasLabMention === computed) return false;
  await db.order.update({
    where: { id: orderId },
    data: { kaitenChatHasLabMention: computed },
  });
  return true;
}

/**
 * Полная синхронизация по комментариям Kaiten с id: флаг, waterline, время «сигнала» для ack пользователей.
 * Возвращает true, если в БД что-то изменилось.
 */
export async function syncKaitenLabMentionFromParsedComments(
  db: PrismaClient,
  orderId: string,
  comments: readonly { id: number; text: string; authorName?: string | null; isCrm?: boolean }[],
  kanbanAdminMentionTag: string | null | undefined,
): Promise<boolean> {
  const labTag = normalizeKanbanAdminMentionTag(kanbanAdminMentionTag);
  const withMention = comments.filter((c) =>
    textIncludesAdminLabMention(c.text, labTag),
  );
  
  // Для сигнала (bump) учитываем только внешние комментарии (не CRM),
  // так как CRM-комментарии уже подняли сигнал при отправке (POST /kanban-chat).
  const externalMentions = withMention.filter((c) => !c.isCrm);
  
  const computed = withMention.length > 0;
  const maxMentionId = computed
    ? Math.max(...withMention.map((c) => c.id))
    : null;

  const row = await db.order.findUnique({
    where: { id: orderId },
    select: {
      kaitenChatHasLabMention: true,
      kaitenLabMentionWaterlineCommentId: true,
    },
  });
  if (!row) return false;

  const prevWl = row.kaitenLabMentionWaterlineCommentId ?? 0;
  
  const maxExternalMentionId = externalMentions.length > 0
    ? Math.max(...externalMentions.map((c) => c.id))
    : null;

  const bumpSignal =
    maxExternalMentionId != null &&
    maxExternalMentionId > prevWl;

  const nextWaterline =
    computed && maxMentionId != null ? maxMentionId : null;
  const flagChanged = row.kaitenChatHasLabMention !== computed;
  const waterlineChanged =
    (row.kaitenLabMentionWaterlineCommentId ?? null) !== nextWaterline;

  if (!flagChanged && !bumpSignal && !waterlineChanged) {
    return false;
  }

  const latestMention =
    bumpSignal && maxExternalMentionId != null
      ? externalMentions.find((c) => c.id === maxExternalMentionId) ??
        externalMentions[externalMentions.length - 1]
      : null;
  const toastAuthor = latestMention?.authorName?.trim().slice(0, 120) || null;
  const toastText = latestMention?.text.replace(/\s+/g, " ").trim().slice(0, 500) || null;

  const signalPatch = bumpSignal ? { kaitenLabMentionSignalAt: new Date() } : {};
  const basePatch = {
    kaitenChatHasLabMention: computed,
    kaitenLabMentionWaterlineCommentId: nextWaterline,
    ...signalPatch,
  };
  try {
    await db.order.update({
      where: { id: orderId },
      data: {
        ...basePatch,
        ...(bumpSignal
          ? {
              kaitenLabMentionToastAuthor: toastAuthor,
              kaitenLabMentionToastText: toastText,
            }
          : {}),
      },
    });
  } catch (err) {
    if (!isMissingToastPreviewColumn(err)) throw err;
    await db.order.update({
      where: { id: orderId },
      data: basePatch,
    });
  }
  return true;
}

/**
 * CRM/канбан: сразу поднимает сигнал заказов при @lab в тексте, без id комментария Kaiten.
 * Waterline обновляется отдельно после readback (`advanceKaitenLabMentionWaterlineOnly`).
 */
export async function syncCrmLabMentionFromCommentText(
  db: PrismaClient,
  orderId: string,
  commentText: string,
  authorLabel: string | null | undefined,
  kanbanAdminMentionTag: string | null | undefined,
): Promise<boolean> {
  const labTag = normalizeKanbanAdminMentionTag(kanbanAdminMentionTag);
  if (!textIncludesAdminLabMention(commentText, labTag)) return false;

  const row = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!row) return false;

  const toastAuthor = authorLabel?.trim().slice(0, 120) || null;
  const toastText = commentText.replace(/\s+/g, " ").trim().slice(0, 500) || null;
  const signalPatch = { kaitenLabMentionSignalAt: new Date() };
  const basePatch = {
    kaitenChatHasLabMention: true,
    ...signalPatch,
  };
  try {
    await db.order.update({
      where: { id: orderId },
      data: {
        ...basePatch,
        kaitenLabMentionToastAuthor: toastAuthor,
        kaitenLabMentionToastText: toastText,
      },
    });
  } catch (err) {
    if (!isMissingToastPreviewColumn(err)) throw err;
    await db.order.update({
      where: { id: orderId },
      data: basePatch,
    });
  }
  return true;
}

/** После CRM→Kaiten sync: только waterline, без повторного bump сигнала. */
export async function advanceKaitenLabMentionWaterlineOnly(
  db: PrismaClient,
  orderId: string,
  kaitenCommentId: number,
): Promise<boolean> {
  const id = Math.trunc(kaitenCommentId);
  if (!Number.isFinite(id) || id <= 0) return false;

  const row = await db.order.findUnique({
    where: { id: orderId },
    select: { kaitenLabMentionWaterlineCommentId: true },
  });
  if (!row) return false;

  const prev = row.kaitenLabMentionWaterlineCommentId ?? 0;
  if (id <= prev) return false;

  await db.order.update({
    where: { id: orderId },
    data: { kaitenLabMentionWaterlineCommentId: id },
  });
  return true;
}
