import { NextResponse } from "next/server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { processTelegramBotUpdate } from "@/lib/telegram-bot-process-update";
import { getTelegramBotUserIdStr } from "@/lib/telegram-bot-identity";
import { tryTelegramBotAddedChatIdAnnounce } from "@/lib/telegram-bot-my-chat-member";
import { tryTelegramDoctorGroupsAndMessenger } from "@/lib/telegram-doctor-groups-and-messenger";
import { buildTelegramConnectivityDiagnostic } from "@/lib/telegram-connectivity-diagnostic.server";

export const dynamic = "force-dynamic";

/** Telegram ждёт ответ вебхука; держим запас до ~60с лимита. */
const WEBHOOK_HANDLE_TIMEOUT_MS = 25_000;

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

async function handleTelegramUpdate(
  body: Record<string, unknown>,
  token: string,
): Promise<{ handledGroup: boolean }> {
  await getTelegramBotUserIdStr(token);
  await tryTelegramBotAddedChatIdAnnounce(body, token);
  const handledGroup = await tryTelegramDoctorGroupsAndMessenger(body, token);
  if (!handledGroup) {
    await processTelegramBotUpdate(body, token);
  }
  return { handledGroup };
}

/**
 * Краткая проверка без логина (для браузера после деплоя).
 * Полный отчёт с вердиктом — Конфигурация → Telegram (`/api/telegram/diagnostic`, OWNER).
 */
export async function GET() {
  const report = await buildTelegramConnectivityDiagnostic();
  return NextResponse.json({
    ok: true,
    hasBotToken: report.env.hasBotToken,
    webhookSecretEnvSet: report.env.webhookSecretEnvSet,
    postPath: "/api/telegram/webhook",
    verdict: report.verdict,
    network: report.network,
    telegram: {
      botMe: report.botApi.getMe.ok
        ? {
            username: report.botApi.getMe.username,
            id: report.botApi.getMe.id,
          }
        : null,
      botMeError: report.botApi.getMe.ok ? null : report.botApi.getMe.error,
      webhookUrl: report.webhook.getWebhookInfo.url,
      webhookUrlOk: report.webhook.getWebhookInfo.urlLooksLikeCrm,
      pendingUpdateCount: report.webhook.getWebhookInfo.pendingUpdateCount,
      lastErrorMessage: report.webhook.getWebhookInfo.lastErrorMessage,
      lastErrorDate: report.webhook.getWebhookInfo.lastErrorDate,
      webhookInfoError: report.webhook.getWebhookInfo.ok
        ? null
        : report.webhook.getWebhookInfo.error,
    },
    notes: report.notes,
    uiHint:
      "Удобный разбор: Конфигурация → Telegram (владелец). JSON для поддержки: кнопка «Скопировать отчёт».",
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

  const updateId = body.update_id;
  const debug = process.env.TELEGRAM_WEBHOOK_DEBUG === "1";

  /**
   * Обрабатываем в том же запросе (не next/server `after`).
   * На Timeweb Apps `after` часто не успевает до «заморозки» процесса:
   * Telegram уже получил 200, а ответ бота уходит минутами/десятками минут позже
   * или теряется, пока исходящий канал к api.telegram.org снова оживёт.
   */
  const startedAt = Date.now();
  let handledGroup = false;
  try {
    const result = await Promise.race([
      handleTelegramUpdate(body, token),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `telegram webhook handle timeout ${WEBHOOK_HANDLE_TIMEOUT_MS}ms`,
            ),
          );
        }, WEBHOOK_HANDLE_TIMEOUT_MS);
      }),
    ]);
    handledGroup = result.handledGroup;
  } catch (e) {
    console.error("[telegram webhook]", e);
  }

  const ms = Date.now() - startedAt;
  if (debug || ms >= 3000) {
    const msg = body.message ?? body.edited_message ?? body.business_message;
    const chat =
      msg && typeof msg === "object"
        ? (msg as { chat?: { type?: string } }).chat
        : null;
    const text =
      msg &&
      typeof msg === "object" &&
      typeof (msg as { text?: unknown }).text === "string"
        ? String((msg as { text: string }).text).slice(0, 80)
        : "";
    console.info("[telegram webhook] processed", {
      updateId,
      ms,
      chatType: chat?.type,
      handledGroup,
      text,
    });
  }

  return NextResponse.json({ ok: true });
}
