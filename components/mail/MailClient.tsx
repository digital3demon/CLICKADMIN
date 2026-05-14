"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Mailbox = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  hasPassword: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  _count?: { messages: number; rules: number };
};

type MessageListRow = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  readState: "UNREAD" | "READ";
  fromText: string;
  toText: string | null;
  subject: string | null;
  preview: string | null;
  labels: unknown;
  isImportant: boolean;
  crmFolder: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  _count: { attachments: number; links: number };
};

type MessageDetail = MessageListRow & {
  ccText: string | null;
  textBody: string | null;
  htmlBody: string | null;
  attachments: Array<{ id: string; fileName: string; mimeType: string; size: number }>;
  links: Array<{ id: string; entityType: string; entityId: string; note: string | null }>;
  mailbox: { id: string; email: string; displayName: string | null };
};

type MailRule = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  conditions: unknown;
  actions: unknown;
};

function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelsText(value: unknown): string {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string").join(", ") : "";
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function MailClient({ defaultEmail }: { defaultEmail: string }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeMailboxId, setActiveMailboxId] = useState("");
  const [messages, setMessages] = useState<MessageListRow[]>([]);
  const [activeMessage, setActiveMessage] = useState<MessageDetail | null>(null);
  const [rules, setRules] = useState<MailRule[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const activeMailbox = useMemo(
    () => mailboxes.find((x) => x.id === activeMailboxId) ?? null,
    [activeMailboxId, mailboxes],
  );

  const loadMailboxes = useCallback(async () => {
    const data = await jsonFetch<{ mailboxes: Mailbox[] }>("/api/mail/mailboxes");
    setMailboxes(data.mailboxes);
    setActiveMailboxId((prev) => prev || data.mailboxes[0]?.id || "");
  }, []);

  const loadMessages = useCallback(async (mailboxId: string) => {
    if (!mailboxId) return;
    const data = await jsonFetch<{ messages: MessageListRow[] }>(
      `/api/mail/messages?mailboxId=${encodeURIComponent(mailboxId)}`,
    );
    setMessages(data.messages);
  }, []);

  const loadRules = useCallback(async (mailboxId: string) => {
    if (!mailboxId) return;
    const data = await jsonFetch<{ rules: MailRule[] }>(
      `/api/mail/mailboxes/${mailboxId}/rules`,
    );
    setRules(data.rules);
  }, []);

  useEffect(() => {
    void loadMailboxes().catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [loadMailboxes]);

  useEffect(() => {
    if (!activeMailboxId) return;
    void loadMessages(activeMailboxId).catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
    void loadRules(activeMailboxId).catch(() => {});
  }, [activeMailboxId, loadMessages, loadRules]);

  async function saveMailbox(form: FormData) {
    setError("");
    setStatus("Сохраняю ящик...");
    await jsonFetch("/api/mail/mailboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") || defaultEmail),
        displayName: String(form.get("displayName") || ""),
        password: String(form.get("password") || ""),
        accessRoles: ["OWNER", "ADMINISTRATOR", "SENIOR_ADMINISTRATOR", "MANAGER"],
      }),
    });
    await loadMailboxes();
    setStatus("Ящик сохранён");
  }

  async function syncMailbox() {
    if (!activeMailboxId) return;
    setError("");
    setStatus("Синхронизирую входящие...");
    const data = await jsonFetch<{ imported: number; skipped: number }>(
      `/api/mail/mailboxes/${activeMailboxId}/sync`,
      { method: "POST" },
    );
    await loadMailboxes();
    await loadMessages(activeMailboxId);
    setStatus(`Синхронизация: импортировано ${data.imported}, пропущено ${data.skipped}`);
  }

  async function openMessage(id: string) {
    const data = await jsonFetch<{ message: MessageDetail }>(`/api/mail/messages/${id}`);
    setActiveMessage(data.message);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, readState: "READ" } : m)));
  }

  async function sendMessage(form: FormData) {
    if (!activeMailboxId) return;
    form.set("mailboxId", activeMailboxId);
    setError("");
    setStatus("Отправляю письмо...");
    await jsonFetch("/api/mail/send", { method: "POST", body: form });
    await loadMessages(activeMailboxId);
    setStatus("Письмо отправлено");
  }

  async function linkMessage(form: FormData) {
    if (!activeMessage) return;
    const entityType = String(form.get("entityType") || "");
    const entityId = String(form.get("entityId") || "");
    const note = String(form.get("note") || "");
    const data = await jsonFetch<{ link: MessageDetail["links"][number] }>(
      `/api/mail/messages/${activeMessage.id}/links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, note }),
      },
    );
    setActiveMessage({ ...activeMessage, links: [...activeMessage.links, data.link] });
  }

  async function addRule(form: FormData) {
    if (!activeMailboxId) return;
    const conditions = JSON.parse(String(form.get("conditions") || "{}")) as unknown;
    const actions = JSON.parse(String(form.get("actions") || "{}")) as unknown;
    await jsonFetch(`/api/mail/mailboxes/${activeMailboxId}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        conditions,
        actions,
      }),
    });
    await loadRules(activeMailboxId);
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[18rem_minmax(22rem,32rem)_minmax(24rem,1fr)]">
      <aside className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">Ящики</h2>
        <form
          className="space-y-2"
          action={(form) => void saveMailbox(form).catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))}
        >
          <input name="email" defaultValue={defaultEmail} className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
          <input name="displayName" placeholder="Имя отправителя" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
          <input name="password" type="password" placeholder="Пароль приложения Яндекса" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
          <button className="w-full rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white" type="submit">
            Сохранить ящик
          </button>
        </form>
        <div className="space-y-1">
          {mailboxes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMailboxId(m.id)}
              className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                activeMailboxId === m.id
                  ? "border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-50"
                  : "border-[var(--card-border)] hover:bg-[var(--table-row-hover)]"
              }`}
            >
              <span className="block font-semibold">{m.email}</span>
              <span className="block text-xs text-[var(--text-muted)]">
                {m._count?.messages ?? 0} писем · {m._count?.rules ?? 0} правил
              </span>
              {m.lastSyncError ? <span className="block text-xs text-rose-500">{m.lastSyncError}</span> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!activeMailbox}
          onClick={() => void syncMailbox().catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))}
          className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--table-row-hover)] disabled:opacity-50"
        >
          Синхронизировать
        </button>
        {status ? <p className="text-xs text-emerald-600">{status}</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </aside>

      <section className="min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <div className="border-b border-[var(--card-border)] px-3 py-2 text-sm font-semibold">
          Письма {activeMailbox ? `· ${activeMailbox.email}` : ""}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {messages.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => void openMessage(m.id).catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))}
              className="block w-full border-b border-[var(--card-border)] px-3 py-2 text-left hover:bg-[var(--table-row-hover)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={m.readState === "UNREAD" ? "font-bold" : "font-medium"}>
                  {m.direction === "INBOUND" ? m.fromText : `Кому: ${m.toText ?? ""}`}
                </span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {dateLabel(m.receivedAt ?? m.sentAt ?? m.createdAt)}
                </span>
              </div>
              <div className="truncate text-sm font-medium">{m.subject || "(без темы)"}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">{m.preview}</div>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                {m.isImportant ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">важно</span> : null}
                {labelsText(m.labels) ? <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-900">{labelsText(m.labels)}</span> : null}
                {m._count.attachments ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900">вложения {m._count.attachments}</span> : null}
                {m._count.links ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">связи {m._count.links}</span> : null}
              </div>
            </button>
          ))}
          {messages.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-muted)]">Писем пока нет. Сохраните ящик и нажмите «Синхронизировать».</p>
          ) : null}
        </div>
      </section>

      <main className="min-w-0 space-y-4">
        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">Новое письмо</h2>
          <form
            className="space-y-2"
            action={(form) => void sendMessage(form).catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))}
          >
            <input name="to" placeholder="Кому" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
            <input name="subject" placeholder="Тема" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
            <textarea name="text" rows={4} placeholder="Текст письма" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
            <input name="attachments" type="file" multiple className="block w-full text-sm" />
            <button type="submit" disabled={!activeMailbox} className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Отправить
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm">
          {activeMessage ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{activeMessage.subject || "(без темы)"}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  От: {activeMessage.fromText} · Кому: {activeMessage.toText || "—"} · {dateLabel(activeMessage.receivedAt ?? activeMessage.sentAt)}
                </p>
              </div>
              <pre className="max-h-[32rem] whitespace-pre-wrap rounded-md bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-body)]">
                {activeMessage.textBody || "Нет текстовой версии письма"}
              </pre>
              {activeMessage.attachments.length ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Вложения</h3>
                  {activeMessage.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/mail/messages/${activeMessage.id}/attachments/${a.id}`}
                      className="block text-sm text-[var(--sidebar-blue)] hover:underline"
                    >
                      {a.fileName} · {Math.ceil(a.size / 1024)} КБ
                    </a>
                  ))}
                </div>
              ) : null}
              <form
                className="grid gap-2 rounded-md border border-[var(--card-border)] p-2 sm:grid-cols-[8rem_1fr]"
                action={(form) => void linkMessage(form).catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))}
              >
                <select name="entityType" className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm">
                  <option value="ORDER">Заказ</option>
                  <option value="CLINIC">Клиника</option>
                  <option value="DOCTOR">Врач</option>
                </select>
                <input name="entityId" placeholder="ID сущности" className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
                <input name="note" placeholder="Комментарий" className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm sm:col-span-2" />
                <button className="rounded-md border border-[var(--input-border)] px-3 py-1.5 text-sm font-semibold sm:col-span-2" type="submit">
                  Привязать к CRM
                </button>
              </form>
              {activeMessage.links.length ? (
                <div className="text-xs text-[var(--text-muted)]">
                  Связи: {activeMessage.links.map((l) => `${l.entityType}:${l.entityId}`).join(", ")}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Выберите письмо для просмотра.</p>
          )}
        </section>

        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">Правила ящика</h2>
          <form
            className="space-y-2"
            action={(form) => void addRule(form).catch((e) => setError(e instanceof Error ? e.message : "Ошибка JSON в правиле"))}
          >
            <input name="name" placeholder="Название правила" className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm" />
            <textarea name="conditions" rows={3} defaultValue={'{"subjectContains":"заказ"}'} className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 font-mono text-xs" />
            <textarea name="actions" rows={3} defaultValue={'{"labels":["Заказ"],"important":true}'} className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 font-mono text-xs" />
            <button type="submit" disabled={!activeMailbox} className="rounded-md border border-[var(--input-border)] px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
              Добавить правило
            </button>
          </form>
          <div className="mt-3 space-y-1">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-[var(--card-border)] p-2 text-xs">
                <div className="font-semibold">{rule.name}</div>
                <div className="text-[var(--text-muted)]">Условия: {JSON.stringify(rule.conditions)}</div>
                <div className="text-[var(--text-muted)]">Действия: {JSON.stringify(rule.actions)}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
