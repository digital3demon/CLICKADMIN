"use client";

import { useCallback, useState } from "react";
import type {
  TelegramConnectivityDiagnostic,
  TelegramDiagCheckStatus,
} from "@/lib/telegram-connectivity-diagnostic.types";

function statusLabel(s: TelegramDiagCheckStatus): string {
  switch (s) {
    case "pass":
      return "OK";
    case "fail":
      return "FAIL";
    case "warn":
      return "WARN";
    case "skip":
      return "—";
    default:
      return s;
  }
}

function statusClass(s: TelegramDiagCheckStatus): string {
  switch (s) {
    case "pass":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "fail":
      return "bg-red-500/15 text-red-700 dark:text-red-300";
    case "warn":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    default:
      return "bg-[var(--surface-subtle)] text-[var(--text-muted)]";
  }
}

function verdictBannerClass(code: string): string {
  if (code === "ok") {
    return "border-emerald-500/40 bg-emerald-500/10";
  }
  if (code === "outbound_blocked" || code === "no_token" || code === "single_user") {
    return "border-red-500/40 bg-red-500/10";
  }
  return "border-amber-500/40 bg-amber-500/10";
}

export function TelegramDiagnosticClient() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<TelegramConnectivityDiagnostic | null>(
    null,
  );
  const [copied, setCopied] = useState<"json" | "ticket" | null>(null);

  const runCheck = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setCopied(null);
    try {
      const res = await fetch("/api/telegram/diagnostic", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        report?: TelegramConnectivityDiagnostic;
      };
      if (!res.ok || !j.report) {
        setReport(null);
        setErr(
          j.error === "forbidden"
            ? "Доступ только у владельца."
            : j.error === "unauthorized"
              ? "Войдите в CRM и повторите."
              : j.error || `Ошибка HTTP ${res.status}`,
        );
        return;
      }
      setReport(j.report);
    } catch (e) {
      setReport(null);
      setErr(e instanceof Error ? e.message : "Сеть");
    } finally {
      setBusy(false);
    }
  }, []);

  const copyText = useCallback(async (kind: "json" | "ticket", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setErr("Не удалось скопировать в буфер обмена");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Проверка идёт <span className="font-medium text-[var(--app-text)]">с сервера CRM</span>{" "}
          (Timeweb), не с вашего ПК. Так видно, достучится ли приложение до{" "}
          <span className="font-mono text-xs">api.telegram.org</span> — без SSH.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runCheck()}
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Проверяю…" : "Проверить доступность Telegram"}
          </button>
          {report ? (
            <span className="text-xs text-[var(--text-muted)]">
              Заняло {report.totalMs} мс · {report.checkedAt}
            </span>
          ) : null}
        </div>
        {err ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}
      </div>

      {report ? (
        <>
          <div
            className={`rounded-lg border px-4 py-4 ${verdictBannerClass(report.verdict.code)}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Вердикт · {report.verdict.code}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--app-text)]">
              {report.verdict.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {report.verdict.summary}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
            <div className="border-b border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text)]">
              Чеклист
            </div>
            <ul className="divide-y divide-[var(--card-border)]">
              {report.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--app-text)]">
                      {c.title}
                    </div>
                    <div className="mt-0.5 break-words text-xs text-[var(--text-secondary)]">
                      {c.detail}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 self-start rounded px-2 py-0.5 text-xs font-semibold ${statusClass(c.status)}`}
                  >
                    {statusLabel(c.status)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm">
              <div className="font-semibold text-[var(--app-text)]">Окружение</div>
              <dl className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div>
                  Публичный URL:{" "}
                  <span className="font-mono text-[var(--app-text)]">
                    {report.env.crmPublicBaseUrl}
                  </span>
                </div>
                <div>
                  Ожидаемый webhook:{" "}
                  <span className="font-mono text-[var(--app-text)]">
                    {report.env.expectedWebhookUrl}
                  </span>
                </div>
                <div>
                  Имя бота (env):{" "}
                  <span className="font-mono text-[var(--app-text)]">
                    {report.env.publicBotUsername
                      ? `@${report.env.publicBotUsername}`
                      : "не задано"}
                  </span>
                </div>
                <div>
                  Токен: {report.env.hasBotToken ? "задан" : "нет"} · секрет
                  webhook:{" "}
                  {report.env.webhookSecretEnvSet ? "задан" : "нет"}
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm">
              <div className="font-semibold text-[var(--app-text)]">Сеть / API</div>
              <dl className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div>
                  DNS: {report.network.dns.ok ? "OK" : "FAIL"} (
                  {report.network.dns.ms} мс)
                  {report.network.dns.addresses.length
                    ? ` · ${report.network.dns.addresses.join(", ")}`
                    : ""}
                </div>
                <div>
                  HTTPS api.telegram.org:{" "}
                  {report.network.httpsRoot.ok ? "OK" : "FAIL"} (
                  {report.network.httpsRoot.ms} мс
                  {report.network.httpsRoot.httpStatus != null
                    ? `, HTTP ${report.network.httpsRoot.httpStatus}`
                    : ""}
                  )
                  {report.network.httpsRoot.error
                    ? ` · ${report.network.httpsRoot.error}`
                    : ""}
                </div>
                <div>
                  getMe: {report.botApi.getMe.ok ? "OK" : "FAIL"} (
                  {report.botApi.getMe.ms} мс)
                  {report.botApi.getMe.username
                    ? ` · @${report.botApi.getMe.username}`
                    : ""}
                  {report.botApi.getMe.error
                    ? ` · ${report.botApi.getMe.error}`
                    : ""}
                </div>
                <div>
                  getWebhookInfo:{" "}
                  {report.webhook.getWebhookInfo.ok ? "OK" : "FAIL"} (
                  {report.webhook.getWebhookInfo.ms} мс)
                  {report.webhook.getWebhookInfo.error
                    ? ` · ${report.webhook.getWebhookInfo.error}`
                    : ""}
                </div>
                {report.webhook.getWebhookInfo.url ? (
                  <div className="break-all">
                    URL в Telegram:{" "}
                    <span className="font-mono text-[var(--app-text)]">
                      {report.webhook.getWebhookInfo.url}
                    </span>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          {report.notes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() =>
                void copyText(
                  "ticket",
                  report.verdict.supportTicketText,
                )
              }
            >
              {copied === "ticket"
                ? "Текст для Timeweb скопирован"
                : "Скопировать текст для поддержки Timeweb"}
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() =>
                void copyText("json", JSON.stringify(report, null, 2))
              }
            >
              {copied === "json" ? "JSON скопирован" : "Скопировать полный JSON"}
            </button>
          </div>

          <details className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--app-text)]">
              Текст для тикета (предпросмотр)
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--text-secondary)]">
              {report.verdict.supportTicketText}
            </pre>
          </details>
        </>
      ) : null}
    </div>
  );
}
