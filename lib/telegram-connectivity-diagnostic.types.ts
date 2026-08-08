export type TelegramDiagCheckStatus = "pass" | "fail" | "warn" | "skip";

export type TelegramDiagCheck = {
  id: string;
  title: string;
  status: TelegramDiagCheckStatus;
  detail: string;
};

export type TelegramDiagVerdictCode =
  | "ok"
  | "single_user"
  | "no_token"
  | "outbound_blocked"
  | "token_invalid"
  | "webhook_mismatch"
  | "webhook_delivery_error"
  | "degraded";

export type TelegramConnectivityDiagnostic = {
  checkedAt: string;
  totalMs: number;
  verdict: {
    code: TelegramDiagVerdictCode;
    title: string;
    summary: string;
    /** Готовый текст для тикета в Timeweb / поддержки */
    supportTicketText: string;
  };
  checks: TelegramDiagCheck[];
  env: {
    singleUserPortable: boolean;
    hasBotToken: boolean;
    webhookSecretEnvSet: boolean;
    publicBotUsername: string | null;
    crmPublicBaseUrl: string;
    expectedWebhookUrl: string;
    telegramApiBase: string;
  };
  network: {
    dns: {
      ok: boolean;
      ms: number;
      addresses: string[];
      error: string | null;
    };
    httpsRoot: {
      ok: boolean;
      ms: number;
      httpStatus: number | null;
      error: string | null;
      host: string;
    };
  };
  botApi: {
    getMe: {
      ok: boolean;
      ms: number;
      id: string | null;
      username: string | null;
      error: string | null;
    };
  };
  webhook: {
    getWebhookInfo: {
      ok: boolean;
      ms: number;
      url: string | null;
      urlLooksLikeCrm: boolean | null;
      pendingUpdateCount: number | null;
      lastErrorMessage: string | null;
      lastErrorDate: number | null;
      lastErrorDateIso: string | null;
      ipAddress: string | null;
      error: string | null;
    };
  };
  notes: string[];
};
