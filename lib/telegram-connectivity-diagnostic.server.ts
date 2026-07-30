import "server-only";

import dns from "node:dns/promises";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { normalizeTelegramBotUsername } from "@/lib/telegram-bot-username";
import {
  fetchTelegramBotMe,
  fetchTelegramWebhookInfo,
} from "@/lib/telegram-webhook-info";
import type {
  TelegramConnectivityDiagnostic,
  TelegramDiagCheck,
  TelegramDiagVerdictCode,
} from "@/lib/telegram-connectivity-diagnostic.types";

export type {
  TelegramConnectivityDiagnostic,
  TelegramDiagCheck,
  TelegramDiagCheckStatus,
  TelegramDiagVerdictCode,
} from "@/lib/telegram-connectivity-diagnostic.types";

const PROBE_TIMEOUT_MS = 15_000;

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

function isNetworkFailError(error: string | null | undefined): boolean {
  if (!error) return false;
  const e = error.toLowerCase();
  return (
    e.includes("fetch failed") ||
    e.includes("сеть до api.telegram.org") ||
    e.includes("network") ||
    e.includes("timeout") ||
    e.includes("таймаут") ||
    e.includes("aborted") ||
    e.includes("econnrefused") ||
    e.includes("enotfound") ||
    e.includes("etimedout") ||
    e.includes("certificate")
  );
}

async function probeDns(
  host: string,
): Promise<{ ok: boolean; ms: number; addresses: string[]; error: string | null }> {
  const started = Date.now();
  try {
    const rows = await dns.lookup(host, { all: true });
    return {
      ok: rows.length > 0,
      ms: Date.now() - started,
      addresses: rows.map((r) => `${r.address} (IPv${r.family})`),
      error: rows.length > 0 ? null : "DNS вернул пустой список",
    };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - started,
      addresses: [],
      error: e instanceof Error ? e.message : "DNS lookup failed",
    };
  }
}

async function probeHttpsRoot(
  url: string,
): Promise<{
  ok: boolean;
  ms: number;
  httpStatus: number | null;
  error: string | null;
}> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    return {
      ok: res.status > 0 && res.status < 500,
      ms: Date.now() - started,
      httpStatus: res.status,
      error: null,
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const msg = e instanceof Error ? e.message : String(e ?? "fetch failed");
    return {
      ok: false,
      ms: Date.now() - started,
      httpStatus: null,
      error:
        name === "AbortError" || msg.toLowerCase().includes("abort")
          ? `Таймаут ${PROBE_TIMEOUT_MS} мс`
          : msg || "fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

function lastErrorIso(unixSec: number | null): string | null {
  if (unixSec == null || !Number.isFinite(unixSec) || unixSec <= 0) return null;
  try {
    return new Date(unixSec * 1000).toISOString();
  } catch {
    return null;
  }
}

function buildSupportTicketText(d: {
  checkedAt: string;
  verdictTitle: string;
  verdictSummary: string;
  dnsOk: boolean;
  dnsError: string | null;
  dnsAddresses: string[];
  httpsOk: boolean;
  httpsMs: number;
  httpsStatus: number | null;
  httpsError: string | null;
  getMeOk: boolean;
  getMeError: string | null;
  getMeMs: number;
  webhookOk: boolean;
  webhookError: string | null;
  webhookUrl: string | null;
  expectedWebhookUrl: string;
  crmPublicBaseUrl: string;
}): string {
  const lines = [
    "Тема: нет исходящего HTTPS с сервера CRM до api.telegram.org",
    "",
    "Суть: приложение CRM на Timeweb не может вызвать Telegram Bot API (sendMessage / getMe). Входящие вебхуки могут доходить, ответы бота — нет.",
    "",
    `Вердикт CRM: ${d.verdictTitle}`,
    d.verdictSummary,
    "",
    `Время проверки (UTC): ${d.checkedAt}`,
    `CRM_PUBLIC_BASE_URL: ${d.crmPublicBaseUrl}`,
    `Ожидаемый webhook: ${d.expectedWebhookUrl}`,
    "",
    "Проверки с сервера приложения:",
    `- DNS api.telegram.org: ${d.dnsOk ? "OK" : "FAIL"} ${d.dnsError ?? ""}`.trim(),
    d.dnsAddresses.length
      ? `  адреса: ${d.dnsAddresses.join(", ")}`
      : "  адреса: (нет)",
    `- HTTPS GET https://api.telegram.org: ${d.httpsOk ? "OK" : "FAIL"} status=${d.httpsStatus ?? "n/a"} ${d.httpsMs}ms ${d.httpsError ?? ""}`.trim(),
    `- Bot API getMe: ${d.getMeOk ? "OK" : "FAIL"} ${d.getMeMs}ms ${d.getMeError ?? ""}`.trim(),
    `- Bot API getWebhookInfo: ${d.webhookOk ? "OK" : "FAIL"} ${d.webhookError ?? ""}`.trim(),
    d.webhookUrl ? `  webhook URL в Telegram: ${d.webhookUrl}` : "  webhook URL: (не получен)",
    "",
    "Просьба: проверить исходящий доступ с этой машины/контейнера Apps к api.telegram.org:443 (DNS + TCP/TLS). Без этого Telegram-бот CRM отвечать не может.",
  ];
  return lines.join("\n");
}

/**
 * Полная диагностика доступности Telegram Bot API с хоста CRM (без секретов).
 */
export async function buildTelegramConnectivityDiagnostic(): Promise<TelegramConnectivityDiagnostic> {
  const startedAll = Date.now();
  const checkedAt = new Date().toISOString();
  const singleUser = isSingleUserPortable();
  const token = botToken();
  const hasBotToken = Boolean(token);
  const webhookSecretEnvSet = Boolean(
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim(),
  );
  const publicBotUsernameRaw = normalizeTelegramBotUsername(
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME,
  );
  const publicBotUsername = publicBotUsernameRaw || null;
  const base = crmPublicBaseUrl();
  const expectedWebhookUrl = `${base}/api/telegram/webhook`;

  const [dnsProbe, httpsProbe] = await Promise.all([
    probeDns("api.telegram.org"),
    probeHttpsRoot("https://api.telegram.org"),
  ]);

  let getMeMs = 0;
  let getMeOk = false;
  let getMeId: string | null = null;
  let getMeUsername: string | null = null;
  let getMeError: string | null = null;

  let whMs = 0;
  let whOk = false;
  let whUrl: string | null = null;
  let whUrlLooksLikeCrm: boolean | null = null;
  let whPending: number | null = null;
  let whLastErr: string | null = null;
  let whLastErrDate: number | null = null;
  let whIp: string | null = null;
  let whError: string | null = null;

  if (token && !singleUser) {
    const t0 = Date.now();
    const me = await fetchTelegramBotMe(token);
    getMeMs = Date.now() - t0;
    if (me.ok) {
      getMeOk = true;
      getMeId = me.id;
      getMeUsername = me.username;
    } else {
      getMeError = me.error;
    }

    const t1 = Date.now();
    const wh = await fetchTelegramWebhookInfo(token);
    whMs = Date.now() - t1;
    if (wh.ok) {
      whOk = true;
      whUrl = wh.url || null;
      whUrlLooksLikeCrm = Boolean(
        wh.url && wh.url.includes("/api/telegram/webhook"),
      );
      whPending = wh.pendingUpdateCount;
      whLastErr = wh.lastErrorMessage;
      whLastErrDate = wh.lastErrorDate;
      whIp = wh.ipAddress;
    } else {
      whError = wh.error;
    }
  } else if (!token) {
    getMeError = "TELEGRAM_BOT_TOKEN не задан";
    whError = "TELEGRAM_BOT_TOKEN не задан";
  } else {
    getMeError = "однопользовательский режим — бот отключён";
    whError = "однопользовательский режим — бот отключён";
  }

  const outboundBlocked =
    (!httpsProbe.ok && isNetworkFailError(httpsProbe.error)) ||
    (!getMeOk && isNetworkFailError(getMeError)) ||
    (!whOk && isNetworkFailError(whError)) ||
    (!dnsProbe.ok && !httpsProbe.ok);

  const tokenInvalid =
    Boolean(token) &&
    !getMeOk &&
    Boolean(getMeError) &&
    !isNetworkFailError(getMeError) &&
    /unauthorized|invalid token|forbidden/i.test(getMeError ?? "");

  const checks: TelegramDiagCheck[] = [
    {
      id: "single_user",
      title: "Режим CRM",
      status: singleUser ? "fail" : "pass",
      detail: singleUser
        ? "NEXT_PUBLIC_CRM_SINGLE_USER=1 — вебхук и бот отключены"
        : "Многопользовательский режим (бот разрешён)",
    },
    {
      id: "bot_token",
      title: "TELEGRAM_BOT_TOKEN",
      status: hasBotToken ? "pass" : "fail",
      detail: hasBotToken
        ? "Задан в окружении (значение не показывается)"
        : "Не задан — бот не сможет отвечать",
    },
    {
      id: "webhook_secret",
      title: "TELEGRAM_WEBHOOK_SECRET",
      status: webhookSecretEnvSet ? "pass" : "warn",
      detail: webhookSecretEnvSet
        ? "Задан: в setWebhook обязателен тот же secret_token, иначе CRM отвечает 403"
        : "Не задан — заголовок X-Telegram-Bot-Api-Secret-Token не проверяется",
    },
    {
      id: "public_base",
      title: "CRM_PUBLIC_BASE_URL",
      status: process.env.CRM_PUBLIC_BASE_URL?.trim() ? "pass" : "warn",
      detail: `Эффективный URL: ${base}. Ожидаемый webhook: ${expectedWebhookUrl}`,
    },
    {
      id: "dns",
      title: "DNS api.telegram.org",
      status: dnsProbe.ok ? "pass" : "fail",
      detail: dnsProbe.ok
        ? `${dnsProbe.ms} мс · ${dnsProbe.addresses.join(", ") || "ok"}`
        : `${dnsProbe.ms} мс · ${dnsProbe.error ?? "ошибка DNS"}`,
    },
    {
      id: "https_root",
      title: "HTTPS до api.telegram.org",
      status: httpsProbe.ok ? "pass" : "fail",
      detail: httpsProbe.ok
        ? `${httpsProbe.ms} мс · HTTP ${httpsProbe.httpStatus}`
        : `${httpsProbe.ms} мс · ${httpsProbe.error ?? "нет ответа"}`,
    },
    {
      id: "get_me",
      title: "Bot API getMe",
      status: !hasBotToken || singleUser ? "skip" : getMeOk ? "pass" : "fail",
      detail: !hasBotToken || singleUser
        ? getMeError ?? "пропуск"
        : getMeOk
          ? `${getMeMs} мс · @${getMeUsername ?? "?"} · id ${getMeId}`
          : `${getMeMs} мс · ${getMeError ?? "ошибка"}`,
    },
    {
      id: "webhook_info",
      title: "Bot API getWebhookInfo",
      status: !hasBotToken || singleUser ? "skip" : whOk ? "pass" : "fail",
      detail: !hasBotToken || singleUser
        ? whError ?? "пропуск"
        : whOk
          ? `${whMs} мс · url=${whUrl || "(пусто)"} · pending=${whPending ?? 0}`
          : `${whMs} мс · ${whError ?? "ошибка"}`,
    },
    {
      id: "webhook_url",
      title: "URL вебхука указывает на CRM",
      status: !whOk
        ? "skip"
        : whUrlLooksLikeCrm
          ? "pass"
          : "fail",
      detail: !whOk
        ? "Нет данных getWebhookInfo"
        : whUrlLooksLikeCrm
          ? `Содержит /api/telegram/webhook: ${whUrl}`
          : `Зарегистрирован другой URL: ${whUrl || "(пусто)"}. Нужен: ${expectedWebhookUrl}`,
    },
    {
      id: "webhook_delivery",
      title: "Доставка вебхука (last_error у Telegram)",
      status: !whOk
        ? "skip"
        : whLastErr
          ? "warn"
          : "pass",
      detail: !whOk
        ? "Нет данных"
        : whLastErr
          ? `${whLastErr}${whLastErrDate ? ` · ${lastErrorIso(whLastErrDate)}` : ""}`
          : "Ошибок доставки не зафиксировано",
    },
  ];

  let verdictCode: TelegramDiagVerdictCode = "ok";
  let verdictTitle = "Telegram API доступен";
  let verdictSummary =
    "Сервер CRM достучался до api.telegram.org. Бот может отправлять ответы, если webhook и секрет настроены верно.";

  if (singleUser) {
    verdictCode = "single_user";
    verdictTitle = "Бот отключён (single-user)";
    verdictSummary =
      "Включён NEXT_PUBLIC_CRM_SINGLE_USER — вебхук и бот не работают. Отключите режим для продакшена с Telegram.";
  } else if (!hasBotToken) {
    verdictCode = "no_token";
    verdictTitle = "Нет TELEGRAM_BOT_TOKEN";
    verdictSummary =
      "В окружении приложения на Timeweb не задан токен бота. Добавьте переменную и перезапустите приложение.";
  } else if (outboundBlocked) {
    verdictCode = "outbound_blocked";
    verdictTitle = "Нет исходящего доступа к api.telegram.org";
    verdictSummary =
      "С хоста CRM (Timeweb) не открывается Telegram Bot API. Сообщения могут доходить вебхуком, но ответы бота и уведомления уходить не будут. Нужен исходящий HTTPS:443 к api.telegram.org или прокси/релей за рубежом.";
  } else if (tokenInvalid) {
    verdictCode = "token_invalid";
    verdictTitle = "Токен бота отклонён Telegram";
    verdictSummary = `getMe вернул ошибку: ${getMeError}. Проверьте TELEGRAM_BOT_TOKEN в панели Timeweb.`;
  } else if (whOk && whUrlLooksLikeCrm === false) {
    verdictCode = "webhook_mismatch";
    verdictTitle = "Вебхук смотрит не на этот CRM";
    verdictSummary = `В Telegram зарегистрирован URL «${whUrl || ""}», ожидается «${expectedWebhookUrl}». Обновите setWebhook.`;
  } else if (whOk && whLastErr) {
    verdictCode = "webhook_delivery_error";
    verdictTitle = "Telegram не может доставить вебхук";
    verdictSummary = `last_error_message: ${whLastErr}. Проверьте HTTPS сертификат домена CRM и доступность ${expectedWebhookUrl} извне.`;
  } else if (
    checks.some((c) => c.status === "fail" || c.status === "warn")
  ) {
    verdictCode = "degraded";
    verdictTitle = "Есть замечания по настройке";
    verdictSummary =
      "Исходящий канал в целом жив, но есть предупреждения (секрет, URL, доставка). Смотрите чеклист ниже.";
  }

  const notes = [
    "Секреты (токен, webhook secret) в отчёт не попадают.",
    "Проверка выполняется с того же сервера, где крутится CRM (важно для Timeweb Apps без SSH).",
    webhookSecretEnvSet
      ? "Если бот «молчит» при живом API — часто 403 из‑за несовпадения TELEGRAM_WEBHOOK_SECRET и secret_token в setWebhook."
      : null,
    outboundBlocked
      ? "Типично для хостингов в РФ: входящий webhook ещё работает, исходящий api.telegram.org — нет."
      : null,
    "После смены env в панели Timeweb — перезапуск приложения обязателен.",
  ].filter(Boolean) as string[];

  const supportTicketText = buildSupportTicketText({
    checkedAt,
    verdictTitle,
    verdictSummary,
    dnsOk: dnsProbe.ok,
    dnsError: dnsProbe.error,
    dnsAddresses: dnsProbe.addresses,
    httpsOk: httpsProbe.ok,
    httpsMs: httpsProbe.ms,
    httpsStatus: httpsProbe.httpStatus,
    httpsError: httpsProbe.error,
    getMeOk,
    getMeError,
    getMeMs,
    webhookOk: whOk,
    webhookError: whError,
    webhookUrl: whUrl,
    expectedWebhookUrl,
    crmPublicBaseUrl: base,
  });

  return {
    checkedAt,
    totalMs: Date.now() - startedAll,
    verdict: {
      code: verdictCode,
      title: verdictTitle,
      summary: verdictSummary,
      supportTicketText,
    },
    checks,
    env: {
      singleUserPortable: singleUser,
      hasBotToken,
      webhookSecretEnvSet,
      publicBotUsername,
      crmPublicBaseUrl: base,
      expectedWebhookUrl,
    },
    network: {
      dns: {
        ok: dnsProbe.ok,
        ms: dnsProbe.ms,
        addresses: dnsProbe.addresses,
        error: dnsProbe.error,
      },
      httpsRoot: {
        ok: httpsProbe.ok,
        ms: httpsProbe.ms,
        httpStatus: httpsProbe.httpStatus,
        error: httpsProbe.error,
      },
    },
    botApi: {
      getMe: {
        ok: getMeOk,
        ms: getMeMs,
        id: getMeId,
        username: getMeUsername,
        error: getMeError,
      },
    },
    webhook: {
      getWebhookInfo: {
        ok: whOk,
        ms: whMs,
        url: whUrl,
        urlLooksLikeCrm: whUrlLooksLikeCrm,
        pendingUpdateCount: whPending,
        lastErrorMessage: whLastErr,
        lastErrorDate: whLastErrDate,
        lastErrorDateIso: lastErrorIso(whLastErrDate),
        ipAddress: whIp,
        error: whError,
      },
    },
    notes,
  };
}
