import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import {
  buildKanbanMentionInCommentTelegramHtmlLine,
  type KanbanMentionTelegramContext,
} from "@/lib/kanban-mention-telegram-html";
import {
  parseKanbanTelegramPrefKey,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import {
  notifyKanbanTelegramSubscribers,
  notifyKanbanTelegramTargetUsers,
} from "@/lib/telegram-kanban-notify";

export const dynamic = "force-dynamic";

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

  return {
    actorDisplayName,
    actorMentionHandle: actorMentionHandle || null,
    linkedOrderId: linkedOrderId || null,
    orderNumberLabel: orderNumberLabel || null,
    kaitenCardId,
    kanbanCardAbsoluteUrl,
    orderPageAbsoluteUrl: orderPageAbsoluteUrl || null,
  };
}

function parseRecipientRoles(raw: unknown): UserRole[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: UserRole[] = [];
  for (const x of raw) {
    if (x === "PRODUCTION") out.push("PRODUCTION");
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

  const kaitenRaw = o.kaitenCardId;
  const skipKaitenDuplicate =
    shouldSkipCrmKanbanTelegram(kaitenRaw as number | null | undefined) &&
    event !== "tg_mentioned_in_comment" &&
    event !== "tg_production_new_card" &&
    event !== "tg_production_mentioned";
  if (skipKaitenDuplicate) {
    return NextResponse.json({ ok: true, skipped: "kaiten" });
  }

  const mentionCtx = parseMentionContextPayload(o.mentionContext);

  let effectiveLines: string[];
  let effectiveLinesAdmin: string[] | undefined;
  let parseMode: "HTML" | undefined;

  if (
    mentionCtx &&
    (event === "tg_mentioned_in_comment" || event === "tg_production_mentioned")
  ) {
    effectiveLines = [buildKanbanMentionInCommentTelegramHtmlLine(mentionCtx)];
    effectiveLinesAdmin = undefined;
    parseMode = "HTML";
  } else {
    const lines = o.lines;
    if (!Array.isArray(lines) || !lines.every((x) => typeof x === "string")) {
      return NextResponse.json({ error: "lines: массив строк" }, { status: 400 });
    }
    effectiveLines = lines as string[];
    const linesAdminRaw = o.linesAdmin;
    effectiveLinesAdmin =
      Array.isArray(linesAdminRaw) &&
      linesAdminRaw.every((x) => typeof x === "string")
        ? (linesAdminRaw as string[])
        : undefined;
    parseMode = o.parseMode === "HTML" ? ("HTML" as const) : undefined;
  }

  const targetUserIds = Array.isArray(o.targetUserIds)
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

  try {
    if (targetUserIds.length > 0) {
      await notifyKanbanTelegramTargetUsers(prisma, {
        event,
        alternatePrefKeys:
          alternatePrefKeys.length > 0 ? alternatePrefKeys : undefined,
        actorUserId,
        targetUserIds,
        lines: effectiveLines,
        parseMode,
        linesAdmin: effectiveLinesAdmin,
        tenantId: tenantId ?? undefined,
      });
    } else {
      await notifyKanbanTelegramSubscribers(prisma, {
        event,
        actorUserId,
        lines: effectiveLines,
        alsoExcludeUserIds: broadcastExcludeUserIds,
        parseMode,
        linesAdmin: effectiveLinesAdmin,
        onlyRoles: recipientRoles,
      });
    }
  } catch (e) {
    console.error("[kanban/telegram-notify]", e);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
