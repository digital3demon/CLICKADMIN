import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { telegramSendMessage } from "@/lib/telegram-send-message";

export const dynamic = "force-dynamic";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const token = botToken();
  if (!token) {
    return NextResponse.json(
      { error: "Не задан TELEGRAM_BOT_TOKEN на сервере" },
      { status: 503 },
    );
  }

  let body: { text?: unknown };
  try {
    body = (await req.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Введите текст ответа" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const itemId = id?.trim() ?? "";
  if (!itemId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const row = await prisma.doctorMessengerItem.findFirst({
    where: {
      id: itemId,
      tenantId,
      status: DoctorMessengerItemStatus.OPEN,
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramMessageId: true,
    },
  });
  if (!row) {
    return NextResponse.json(
      { error: "Сообщение не найдено или уже в архиве" },
      { status: 404 },
    );
  }

  const replyToMid = Number(row.telegramMessageId);
  if (!Number.isFinite(replyToMid)) {
    return NextResponse.json({ error: "Некорректный id сообщения Telegram" }, {
      status: 500,
    });
  }

  const sent = await telegramSendMessage(token, row.telegramChatId, text, {
    replyToMessageId: Math.trunc(replyToMid),
  });
  if (!sent.ok) {
    return NextResponse.json(
      { error: sent.error || "Не удалось отправить в Telegram" },
      { status: 502 },
    );
  }

  const now = new Date();
  await prisma.doctorMessengerItem.update({
    where: { id: row.id },
    data: {
      status: DoctorMessengerItemStatus.ARCHIVED,
      archivedAt: now,
      replyText: text,
      replyAuthorUserId: session.sub,
      repliedAt: now,
      replyTelegramMessageId: sent.sentMessageId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
