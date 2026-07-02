"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClickMigConfigJson } from "@/lib/clickmig/types";

export function ClickMigConfigClient() {
  const [config, setConfig] = useState<ClickMigConfigJson | null>(null);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("КликМиг");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/clickmig/config");
    const data = (await res.json()) as {
      config: ClickMigConfigJson;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpFromEmail?: string;
      smtpFromName?: string;
    };
    setConfig(data.config);
    setSmtpHost(data.smtpHost ?? "");
    setSmtpPort(data.smtpPort ?? 465);
    setSmtpUser(data.smtpUser ?? "");
    setSmtpFromEmail(data.smtpFromEmail ?? "");
    setSmtpFromName(data.smtpFromName ?? "КликМиг");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!config) return;
    const res = await fetch("/api/clickmig/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        smtpHost: smtpHost || null,
        smtpPort,
        smtpUser: smtpUser || null,
        smtpPass: smtpPass || undefined,
        smtpFromEmail: smtpFromEmail || null,
        smtpFromName: smtpFromName || null,
      }),
    });
    const data = (await res.json()) as { config: ClickMigConfigJson; apiKey?: string };
    setConfig(data.config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function regenerateKey() {
    const res = await fetch("/api/clickmig/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateApiKey: true }),
    });
    const data = (await res.json()) as { apiKey?: string; config: ClickMigConfigJson };
    setConfig(data.config);
    if (data.apiKey) setApiKey(data.apiKey);
  }

  if (!config) return <p className="text-sm text-[var(--muted)]">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">SMTP (noreply@clickmig.ru)</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="SMTP host"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
          />
          <input
            type="number"
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Port"
            value={smtpPort}
            onChange={(e) => setSmtpPort(Number(e.target.value))}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="User"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
          />
          <input
            type="password"
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Password"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="From email"
            value={smtpFromEmail}
            onChange={(e) => setSmtpFromEmail(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="From name"
            value={smtpFromName}
            onChange={(e) => setSmtpFromName(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Публичный API (внешние сайты)</h2>
        <p className="text-sm text-[var(--muted)]">
          Форма на <code>test.click-lab.online</code> уже внутри CRM (корень → форма).
          API key нужен только для отдельного фронта. Заголовок:{" "}
          <code>x-clickmig-api-key</code>. Origins:{" "}
          {config.allowedOrigins.join(", ")}
        </p>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-sm"
          onClick={() => void regenerateKey()}
        >
          Сгенерировать новый API key
        </button>
        {apiKey && (
          <p className="rounded bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
            Сохраните ключ (показывается один раз): <code>{apiKey}</code>
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Участники</h2>
        <label className="block text-sm">
          ID ответственного
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={config.defaultAssigneeUserId ?? ""}
            onChange={(e) =>
              setConfig({ ...config, defaultAssigneeUserId: e.target.value || null })
            }
          />
        </label>
        <label className="block text-sm">
          ID участников (через запятую)
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={config.participantUserIds.join(", ")}
            onChange={(e) =>
              setConfig({
                ...config,
                participantUserIds: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="block text-sm">
          Макс. карточек на участника
          <input
            type="number"
            min={1}
            max={10}
            className="mt-1 w-24 rounded border px-2 py-1.5 text-sm"
            value={config.maxCardsPerParticipant}
            onChange={(e) =>
              setConfig({
                ...config,
                maxCardsPerParticipant: Number(e.target.value) || 3,
              })
            }
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Типы конструкций (JSON)</h2>
        <textarea
          className="h-40 w-full rounded border p-2 font-mono text-xs"
          value={JSON.stringify(config.constructionTypes, null, 2)}
          onChange={(e) => {
            try {
              setConfig({
                ...config,
                constructionTypes: JSON.parse(e.target.value) as ClickMigConfigJson["constructionTypes"],
              });
            } catch {
              /* ignore invalid json while typing */
            }
          }}
        />
      </section>

      <button
        type="button"
        className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm text-white"
        onClick={() => void save()}
      >
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    </div>
  );
}
