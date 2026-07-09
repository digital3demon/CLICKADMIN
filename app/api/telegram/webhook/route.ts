import { after, NextResponse } from "next/server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { processTelegramBotUpdate } from "@/lib/telegram-bot-process-update";
import { getTelegramBotUserIdStr } from "@/lib/telegram-bot-identity";
import { tryTelegramBotAddedChatIdAnnounce } from "@/lib/telegram-bot-my-chat-member";
import { tryTelegramDoctorGroupsAndMessenger } from "@/lib/telegram-doctor-groups-and-messenger";
import {
  fetchTelegramBotMe,
  fetchTelegramWebhookInfo,
} from "@/lib/telegram-webhook-info";

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
  const token = botToken();
  const [webhookInfo, botMe] = token
    ? await Promise.all([
        fetchTelegramWebhookInfo(token),
        fetchTelegramBotMe(token),
      ])
    : [null, null];

  const webhookUrlOk =
    webhookInfo?.ok === true &&
    webhookInfo.url.includes("/api/telegram/webhook");

  const telegramOutboundFailed =
    (webhookInfo?.ok === false && webhookInfo.error === "fetch failed") ||
    (botMe?.ok === false && botMe.error === "fetch failed");

  return NextResponse.json({
    ok: true,
    hasBotToken: hasToken,
    webhookSecretEnvSet: secretSet,
    postPath: "/api/telegram/webhook",
    telegram: {
      botMe: botMe?.ok === true ? { username: botMe.username, id: botMe.id } : null,
      botMeError: botMe?.ok === false ? botMe.error : null,
      webhookUrl: webhookInfo?.ok === true ? webhookInfo.url : null,
      webhookUrlOk,
      pendingUpdateCount:
        webhookInfo?.ok === true ? webhookInfo.pendingUpdateCount : null,
      lastErrorMessage:
        webhookInfo?.ok === true ? webhookInfo.lastErrorMessage : null,
      lastErrorDate:
        webhookInfo?.ok === true ? webhookInfo.lastErrorDate : null,
      webhookInfoError: webhookInfo?.ok === false ? webhookInfo.error : null,
    },
    notes: [
      "URL в CRM не вводится: его указываете только в setWebhook у Telegram (https://ваш-домен/api/telegram/webhook).",
      secretSet
        ? "TELEGRAM_WEBHOOK_SECRET задан: в setWebhook обязателен тот же secret_token. Без него Telegram шлёт запрос без заголовка — CRM отвечает 403, бот «молчит»."
        : "TELEGRAM_WEBHOOK_SECRET не задан — заголовок X-Telegram-Bot-Api-Secret-Token не проверяется.",
      webhookInfo?.ok === true && webhookInfo.lastErrorMessage
        ? `Telegram не доставляет вебхук: ${webhookInfo.lastErrorMessage}`
        : null,
      webhookInfo?.ok === true && !webhookUrlOk
        ? "В Telegram зарегистрирован другой URL вебхука — обновите setWebhook."
        : null,
      telegramOutboundFailed
        ? "Сервер не достучался до api.telegram.org (fetch failed). Ответы бота и getWebhookInfo будут с задержкой или ретраями — проверьте исходящий HTTPS/DNS с хоста CRM."
        : null,
      "После правок .env перезапустите процесс Node (pm2/docker/systemd).",
    ].filter(Boolean),
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

  after(async () => {
    const startedAt = Date.now();
    let handledGroup = false;
    try {
      await getTelegramBotUserIdStr(token);
      await tryTelegramBotAddedChatIdAnnounce(body, token);
      handledGroup = await tryTelegramDoctorGroupsAndMessenger(body, token);
      if (!handledGroup) {
        await processTelegramBotUpdate(body, token);
      }
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
  });

  return NextResponse.json({ ok: true });
}
