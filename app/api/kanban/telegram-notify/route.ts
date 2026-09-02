import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import {
  buildKanbanMentionInCommentTelegramHtmlLines,
  type KanbanMentionTelegramContext,
} from "@/lib/kanban-mention-telegram-html";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import {
  parseKanbanTelegramPrefKey,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { loadOrderKanbanTelegramMemberIds } from "@/lib/telegram-kanban-card-members.server";
import {
  isCardMemberScopedTelegramEvent,
  mergeTelegramSelfActorIntoTargets,
  uniqTelegramTargetUserIds,
} from "@/lib/telegram-kanban-card-scope";
import type { KanbanTelegramActionContext } from "@/lib/telegram-kanban-action-keyboard";
import {
  notifyKanbanTelegramSubscribers,
  notifyKanbanTelegramTargetUsers,
} from "@/lib/telegram-kanban-notify";

export const dynamic = "force-dynamic";

function firstHttpsHrefFromLines(lines: string[]): string {
  for (const line of lines) {
    const m = /href="(https?:\/\/[^"]+)"/i.exec(line);
    if (m?.[1]) return m[1];
  }
  return "";
}

function buildActionContext(opts: {
  initiatorUserId: string;
  orderId: string;
  cardId: string;
  mentionCtx: KanbanMentionTelegramContext | null;
  lines: string[];
}): KanbanTelegramActionContext | null {
  const initiatorUserId = opts.initiatorUserId.trim();
  if (!initiatorUserId) return null;
  const chatUrl =
    opts.mentionCtx?.kanbanCardAbsoluteUrl?.trim() ||
    (opts.orderId
      ? `${crmPublicBaseUrl().replace(/\/+$/, "")}${kanbanOrderDeepLinkPath(opts.orderId)}`
      : "") ||
    firstHttpsHrefFromLines(opts.lines);
  if (!chatUrl && !opts.orderId && !opts.cardId) return null;
  return {
    initiatorUserId,
    chatUrl: chatUrl || "",
    orderId: opts.orderId || null,
    cardId: opts.cardId || null,
  };
}
function parseMentionContextPayload(
  raw: unknown,
): KanbanMentionTelegramContext | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  const actorDisplayName =
    typeof m.actorDisplayName === "string" ? m.actorDisplayName.trim() : "";
  const kanbanCardAbsoluteUrl =
    typeof m.kanbanCardAbsoluteUrl === "string"
      ? m.kanbanCardAbsoluteUrl.trim()
      : "";
  if (!actorDisplayName || !kanbanCardAbsoluteUrl) return null;

  const linkedOrderId =
    typeof m.linkedOrderId === "string" ? m.linkedOrderId.trim() : "";
  const orderPageAbsoluteUrl =
    typeof m.orderPageAbsoluteUrl === "string"
      ? m.orderPageAbsoluteUrl.trim()
      : "";
  if (linkedOrderId && !orderPageAbsoluteUrl) return null;

  const orderNumberLabel =
    typeof m.orderNumberLabel === "string" ? m.orderNumberLabel.trim() : "";
  const actorMentionHandle =
    typeof m.actorMentionHandle === "string" ? m.actorMentionHandle.trim() : "";

  let kaitenCardId: number | null = null;
  if (m.kaitenCardId != null && Number.isFinite(Number(m.kaitenCardId))) {
    kaitenCardId = Number(m.kaitenCardId);
  }

  const commentText =
    typeof m.commentText === "string" ? m.commentText : "";

  return {
    actorDisplayName,
    actorMentionHandle: actorMentionHandle || null,
    linkedOrderId: linkedOrderId || null,
    orderNumberLabel: orderNumberLabel || null,
    kaitenCardId,
    kanbanCardAbsoluteUrl,
    orderPageAbsoluteUrl: orderPageAbsoluteUrl || null,
    commentText: commentText || null,
  };
}

function parseRecipientRoles(raw: unknown): UserRole[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: UserRole[] = [];
  for (const x of raw) {
    if (x === "PRODUCTION") out.push("PRODUCTION");
    if (x === "SENIOR_PRODUCTION") out.push("SENIOR_PRODUCTION");
  }
  return out.length ? out : undefined;
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (session.demo) {
    return NextResponse.json({ ok: true, skipped: "demo" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ожидается объект" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;

  const event = parseKanbanTelegramPrefKey(o.event);
  if (!event) {
    return NextResponse.json({ error: "Неизвестное событие" }, { status: 400 });
  }

  const mentionCtx = parseMentionContextPayload(o.mentionContext);
  if (mentionCtx && typeof o.commentText === "string" && !mentionCtx.commentText) {
    mentionCtx.commentText = o.commentText;
  }

  let effectiveLines: string[];
  let effectiveLinesAdmin: string[] | undefined;
  let effectiveLinesSelf: string[] | undefined = undefined;
  let effectiveLinesSelfAdmin: string[] | undefined = undefined;
  let parseMode: "HTML" | undefined;

  if (
    mentionCtx &&
    (event === "tg_mentioned_in_comment" || event === "tg_production_mentioned")
  ) {
    effectiveLines = buildKanbanMentionInCommentTelegramHtmlLines(mentionCtx);
    effectiveLinesAdmin = undefined;
    parseMode = "HTML";
  } else {
    const lines = o.lines;
    if (!Array.isArray(lines) || !lines.every((x) => typeof x === "string")) {
      return NextResponse.json({ error: "lines: массив строк" }, { status: 400 });
    }
    effectiveLines = lines as string[];
    const asStrArr = (raw: unknown): string[] | undefined =>
      Array.isArray(raw) && raw.every((x) => typeof x === "string")
        ? (raw as string[])
        : undefined;
    effectiveLinesAdmin = asStrArr(o.linesAdmin);
    effectiveLinesSelf = asStrArr(o.linesSelf);
    effectiveLinesSelfAdmin = asStrArr(o.linesSelfAdmin);
    parseMode = o.parseMode === "HTML" ? ("HTML" as const) : undefined;
  }

  let targetUserIds = Array.isArray(o.targetUserIds)
    ? o.targetUserIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const broadcastExcludeUserIds = Array.isArray(o.broadcastExcludeUserIds)
    ? o.broadcastExcludeUserIds.filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      )
    : [];

  const altRaw = o.alternatePrefKeys;
  const alternatePrefKeys: KanbanTelegramPrefKey[] = [];
  if (Array.isArray(altRaw)) {
    for (const x of altRaw) {
      const k = parseKanbanTelegramPrefKey(x);
      if (k) alternatePrefKeys.push(k);
    }
  }

  const prisma = await getPrisma();
  const actorUserId = session.sub;
  const tenantId = await getTenantIdForSession(session);
  const recipientRoles = parseRecipientRoles(o.recipientRoles);
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  const cardId = typeof o.cardId === "string" ? o.cardId.trim() : "";
  const actionContext = buildActionContext({
    initiatorUserId: actorUserId,
    orderId,
    cardId,
    mentionCtx,
    lines: effectiveLines,
  });

  if (
    isCardMemberScopedTelegramEvent(event) &&
    targetUserIds.length === 0 &&
    tenantId &&
    orderId
  ) {
    targetUserIds = await loadOrderKanbanTelegramMemberIds(tenantId, orderId);
  }
  targetUserIds = mergeTelegramSelfActorIntoTargets(
    uniqTelegramTargetUserIds(targetUserIds),
    actorUserId,
    Boolean(effectiveLinesSelf?.some(Boolean)),
  );

  try {
    if (targetUserIds.length > 0) {
      const isMentionNotify =
        event === "tg_mentioned_in_comment" || event === "tg_production_mentioned";
      await notifyKanbanTelegramTargetUsers(prisma, {
        event,
        alternatePrefKeys:
          alternatePrefKeys.length > 0 ? alternatePrefKeys : undefined,
        // @себя = напоминание. «Добавил/снял себя» — linesSelf, автор в targets.
        actorUserId: isMentionNotify ? null : actorUserId,
        targetUserIds,
        lines: effectiveLines,
        parseMode,
        linesAdmin: effectiveLinesAdmin,
        linesSelf: effectiveLinesSelf,
        linesSelfAdmin: effectiveLinesSelfAdmin,
        tenantId: tenantId ?? undefined,
        actionContext,
      });
    } else if (isCardMemberScopedTelegramEvent(event)) {
      /* Без людей на карточке не рассылаем всей лаборатории. */
    } else {
      await notifyKanbanTelegramSubscribers(prisma, {
        event,
        actorUserId,
        lines: effectiveLines,
        alsoExcludeUserIds: broadcastExcludeUserIds,
        parseMode,
        linesAdmin: effectiveLinesAdmin,
        onlyRoles: recipientRoles,
        actionContext,
      });
    }
  } catch (e) {
    console.error("[kanban/telegram-notify]", e);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
