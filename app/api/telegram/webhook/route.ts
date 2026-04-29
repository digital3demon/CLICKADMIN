import { NextResponse } from "next/server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { processTelegramBotUpdate } from "@/lib/telegram-bot-process-update";

export const dynamic = "force-dynamic";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/**
 * Проверка конфигурации (без секретов). Откройте в браузере после деплоя.
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
  const hasToken = Boolean(botToken());
  const secretSet = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim());
  return NextResponse.json({
    ok: true,
    hasBotToken: hasToken,
    webhookSecretEnvSet: secretSet,
    postPath: "/api/telegram/webhook",
    notes: [
      "URL в CRM не вводится: его указываете только в setWebhook у Telegram (https://ваш-домен/api/telegram/webhook).",
      secretSet
        ? "TELEGRAM_WEBHOOK_SECRET задан: в setWebhook обязателен тот же secret_token. Без него Telegram шлёт запрос без заголовка — CRM отвечает 403, бот «молчит»."
        : "TELEGRAM_WEBHOOK_SECRET не задан — заголовок X-Telegram-Bot-Api-Secret-Token не проверяется.",
      "После правок .env перезапустите процесс Node (pm2/docker/systemd).",
    ],
  });
}

/**
 * Входящие обновления от Telegram (Bot API webhook).
 * Зарегистрируйте URL и секрет: `TELEGRAM_WEBHOOK_SECRET` совпадает с `secret_token` в setWebhook.
 */
export async function POST(req: Request) {
  if (isSingleUserPortable()) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const token = botToken();
  if (!token) {
    return NextResponse.json({ error: "no bot token" }, { status: 503 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token")?.trim();
    if (got !== secret) {
      console.warn(
        "[telegram webhook] 403: заголовок X-Telegram-Bot-Api-Secret-Token отсутствует или не совпадает с TELEGRAM_WEBHOOK_SECRET. " +
          "Повторите setWebhook с secret_token равным значению из .env, либо удалите TELEGRAM_WEBHOOK_SECRET и снимите secret в Telegram.",
      );
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await processTelegramBotUpdate(body, token);
  } catch (e) {
    console.error("[telegram webhook]", e);
  }
  return NextResponse.json({ ok: true });
}
