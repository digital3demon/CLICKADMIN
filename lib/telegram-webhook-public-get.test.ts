import { describe, expect, it } from "vitest";
import {
  telegramWebhookAnonymousGetJson,
  telegramWebhookProductionGetJson,
} from "./telegram-webhook-public-get";

import type { TelegramConnectivityDiagnostic } from "@/lib/telegram-connectivity-diagnostic.types";

const report = {
  checkedAt: "2026-01-01T00:00:00.000Z",
  totalMs: 1,
  verdict: {
    code: "ok",
    title: "ok",
    summary: "ok",
    supportTicketText: "",
  },
  checks: [],
  env: {
    singleUserPortable: false,
    hasBotToken: true,
    webhookSecretEnvSet: true,
    publicBotUsername: "LabBot",
    crmPublicBaseUrl: "https://crm.example",
    expectedWebhookUrl: "https://crm.example/api/telegram/webhook",
    telegramApiBase: "https://api.telegram.org",
  },
  network: {
    dns: { ok: true, ms: 1, addresses: [], error: null },
    httpsRoot: {
      ok: true,
      ms: 1,
      httpStatus: 200,
      error: null,
      host: "api.telegram.org",
    },
  },
  botApi: {
    getMe: { ok: true, ms: 1, id: "1", username: "LabBot", error: null },
  },
  webhook: {
    getWebhookInfo: {
      ok: true,
      ms: 1,
      url: "https://crm.example/api/telegram/webhook",
      urlLooksLikeCrm: true,
      pendingUpdateCount: 2,
      lastErrorMessage: null,
      lastErrorDate: null,
      lastErrorDateIso: null,
      ipAddress: null,
      error: null,
    },
  },
  notes: ["x"],
} satisfies TelegramConnectivityDiagnostic;

describe("telegramWebhookAnonymousGetJson", () => {
  it("production GET не ходит в полный отчёт", () => {
    const prev = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "x";
    try {
      const j = telegramWebhookProductionGetJson();
      expect(j).toEqual({
        ok: true,
        hasBotToken: true,
        webhookSecretEnvSet: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
      });
      expect(JSON.stringify(j)).not.toMatch(/username|webhookUrl|LabBot/i);
    } finally {
      if (prev === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = prev;
    }
  });

  it("в production не отдаёт username и URL", () => {
    const j = telegramWebhookAnonymousGetJson(report, true);
    expect(j).toEqual({
      ok: true,
      hasBotToken: true,
      webhookSecretEnvSet: true,
    });
    expect(JSON.stringify(j)).not.toMatch(/LabBot|crm\.example|username|webhookUrl/i);
  });

  it("вне production оставляет разбор для локального деплоя", () => {
    const j = telegramWebhookAnonymousGetJson(report, false);
    expect(j.hasBotToken).toBe(true);
    expect((j.telegram as { webhookUrl?: string }).webhookUrl).toContain(
      "telegram/webhook",
    );
  });
});
