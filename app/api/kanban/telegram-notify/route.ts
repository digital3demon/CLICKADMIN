import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import {
  parseKanbanTelegramPrefKey,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { getPrisma } from "@/lib/get-prisma";
import {
  notifyKanbanTelegramSubscribers,
  notifyKanbanTelegramTargetUsers,
} from "@/lib/telegram-kanban-notify";

export const dynamic = "force-dynamic";

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

  const kaitenRaw = o.kaitenCardId;
  if (shouldSkipCrmKanbanTelegram(kaitenRaw as number | null | undefined)) {
    return NextResponse.json({ ok: true, skipped: "kaiten" });
  }

  const event = parseKanbanTelegramPrefKey(o.event);
  if (!event) {
    return NextResponse.json({ error: "Неизвестное событие" }, { status: 400 });
  }

  const lines = o.lines;
  if (!Array.isArray(lines) || !lines.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "lines: массив строк" }, { status: 400 });
  }

  const linesAdminRaw = o.linesAdmin;
  const linesAdmin =
    Array.isArray(linesAdminRaw) &&
    linesAdminRaw.every((x) => typeof x === "string")
      ? (linesAdminRaw as string[])
      : undefined;

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

  const parseMode = o.parseMode === "HTML" ? ("HTML" as const) : undefined;

  const prisma = await getPrisma();
  const actorUserId = session.sub;

  try {
    if (targetUserIds.length > 0) {
      await notifyKanbanTelegramTargetUsers(prisma, {
        event,
        alternatePrefKeys:
          alternatePrefKeys.length > 0 ? alternatePrefKeys : undefined,
        actorUserId,
        targetUserIds,
        lines: lines as string[],
        parseMode,
        linesAdmin,
      });
    } else {
      await notifyKanbanTelegramSubscribers(prisma, {
        event,
        actorUserId,
        lines: lines as string[],
        alsoExcludeUserIds: broadcastExcludeUserIds,
        parseMode,
        linesAdmin,
      });
    }
  } catch (e) {
    console.error("[kanban/telegram-notify]", e);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
