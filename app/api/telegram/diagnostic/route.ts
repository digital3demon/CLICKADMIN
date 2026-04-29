import { NextResponse } from "next/server";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/**
 * Проверка настроек бота (без секретов). GET — открывается в браузере.
 * Основной вебхук остаётся POST-only для Telegram; диагностика вынесена сюда,
 * чтобы на старых сборках без GET на `/api/telegram/webhook` всё равно была ссылка.
 */
export async function GET() {
  if (isSingleUserPortable()) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "NEXT_PUBLIC_CRM_SINGLE_USER=1 — вебхук отключён. Для бота отключите однопользовательский режим.",
      },
      { status: 503 },
    );
  }
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const secretSet = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim());
  return NextResponse.json(
    {
      ok: true,
      hasBotToken: hasToken,
      webhookSecretEnvSet: secretSet,
      telegramPostsTo: "/api/telegram/webhook",
      notes: [
        "Telegram шлёт только POST на /api/telegram/webhook. Эта страница — только проверка env.",
        "Если в .env задан TELEGRAM_WEBHOOK_SECRET — в setWebhook нужен тот же secret_token.",
        "После правок .env перезапустите Node. Если GET /api/telegram/webhook даёт 405 — обновите сборку (там тоже есть диагностический GET).",
      ],
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
