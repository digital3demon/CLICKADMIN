import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import {
  telegramIdString,
  verifyTelegramWidgetAuth,
} from "@/lib/auth/telegram-widget";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/** Привязка Telegram к уже вошедшему пользователю — для уведомлений, без проверки телефона. */
export async function POST(req: Request) {
  try {
    if (isSingleUserPortable()) {
      return NextResponse.json(
        { error: "В однопользовательском режиме привязка Telegram недоступна" },
        { status: 403 },
      );
    }

    const secretMissing = jsonResponseIfAuthSecretMissing();
    if (secretMissing) return secretMissing;

    const token = botToken();
    if (!token) {
      return NextResponse.json(
        { error: "Не задан TELEGRAM_BOT_TOKEN на сервере" },
        { status: 503 },
      );
    }

    const session = await getSessionFromCookies();
    if (!session?.sub || session.demo) {
      return NextResponse.json({ error: "Требуется вход (не демо)" }, { status: 401 });
    }

    let raw: Record<string, unknown>;
    try {
      raw = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }

    const auth = verifyTelegramWidgetAuth(raw, token);
    if (!auth) {
      return NextResponse.json(
        { error: "Неверная или устаревшая подпись Telegram" },
        { status: 401 },
      );
    }

    const tid = telegramIdString(auth.id);
    const taken = await prisma.user.findFirst({
      where: {
        telegramId: tid,
        NOT: { id: session.sub },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Этот Telegram уже привязан к другой учётной записи" },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: {
        telegramId: tid,
        telegramUsername: auth.username?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST link-telegram]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить привязку" },
      { status: 500 },
    );
  }
}
