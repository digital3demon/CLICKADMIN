import type { TelegramConnectivityDiagnostic } from "@/lib/telegram-connectivity-diagnostic.types";

/** GET без вызова Telegram API — для production. */
export function telegramWebhookProductionGetJson(): {
  ok: true;
  hasBotToken: boolean;
  webhookSecretEnvSet: boolean;
} {
  return {
    ok: true,
    hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    webhookSecretEnvSet: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
  };
}

/** GET /api/telegram/webhook: в production без username и URL. */
export function telegramWebhookAnonymousGetJson(
  report: TelegramConnectivityDiagnostic,
  production: boolean,
): Record<string, unknown> {
  if (production) {
    return {
      ok: true,
      hasBotToken: report.env.hasBotToken,
      webhookSecretEnvSet: report.env.webhookSecretEnvSet,
    };
  }

  const getMe = report.botApi.getMe;
  const wh = report.webhook.getWebhookInfo;
  return {
    ok: true,
    hasBotToken: report.env.hasBotToken,
    webhookSecretEnvSet: report.env.webhookSecretEnvSet,
    postPath: "/api/telegram/webhook",
    verdict: report.verdict,
    network: report.network,
    telegram: {
      botMe: getMe?.ok
        ? { username: getMe.username, id: getMe.id }
        : null,
      botMeError: getMe?.ok ? null : (getMe?.error ?? null),
      webhookUrl: wh?.url,
      webhookUrlOk: wh?.urlLooksLikeCrm,
      pendingUpdateCount: wh?.pendingUpdateCount,
      lastErrorMessage: wh?.lastErrorMessage,
      lastErrorDate: wh?.lastErrorDate,
      webhookInfoError: wh?.ok ? null : (wh?.error ?? null),
    },
    notes: report.notes,
    uiHint:
      "Удобный разбор: Конфигурация → Telegram (владелец). JSON для поддержки: кнопка «Скопировать отчёт».",
  };
}
