"use client";

import { useEffect, useRef, useState } from "react";
import {
  FINANCE_OFFICE_DEBT_PLACEHOLDERS,
} from "@/lib/finance-office-debt-settings";

type AccountOpt = { id: string; email: string; displayName: string | null };
type FocusField = "subject" | "body" | "docSubject" | "docBody";

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string,
  setValue: (next: string) => void,
) {
  if (!el) {
    setValue(`${value}${token}`);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  setValue(next);
  const pos = start + token.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

export function FinanceOfficeTenantSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [workingDays, setWorkingDays] = useState("10");
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState("");
  const [documentSubject, setDocumentSubject] = useState("");
  const [documentTemplate, setDocumentTemplate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [focusField, setFocusField] = useState<FocusField>("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const docSubjectRef = useRef<HTMLInputElement>(null);
  const docBodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/directory/finance-office", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          workingDays?: number;
          subject?: string;
          template?: string;
          documentSubject?: string;
          documentTemplate?: string;
          accountId?: string | null;
          accounts?: AccountOpt[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Не удалось загрузить");
          return;
        }
        setWorkingDays(String(j.workingDays ?? 10));
        setSubject(j.subject ?? "");
        setTemplate(j.template ?? "");
        setDocumentSubject(j.documentSubject ?? "");
        setDocumentTemplate(j.documentTemplate ?? "");
        setAccountId(j.accountId ?? "");
        setAccounts(Array.isArray(j.accounts) ? j.accounts : []);
      })
      .catch(() => {
        if (!cancelled) setError("Сеть недоступна");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const insertPlaceholder = (token: string) => {
    if (focusField === "subject") {
      insertAtCursor(subjectRef.current, subject, token, setSubject);
      return;
    }
    if (focusField === "docSubject") {
      insertAtCursor(
        docSubjectRef.current,
        documentSubject,
        token,
        setDocumentSubject,
      );
      return;
    }
    if (focusField === "docBody") {
      insertAtCursor(
        docBodyRef.current,
        documentTemplate,
        token,
        setDocumentTemplate,
      );
      return;
    }
    insertAtCursor(bodyRef.current, template, token, setTemplate);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/directory/finance-office", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: Number(workingDays),
          subject,
          template,
          documentSubject,
          documentTemplate,
          accountId: accountId || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Ошибка сохранения");
        return;
      }
      setOk(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-days"
        >
          Срок долга, рабочих дней МСК
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          От даты выставления счёта. Пн–пт, без праздников РФ.
        </p>
        <input
          id="fo-debt-days"
          type="number"
          min={1}
          max={365}
          className="mt-2 w-28 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
          value={workingDays}
          onChange={(e) => setWorkingDays(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-account"
        >
          Ящик для рассылки
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Если ящиков несколько — выберите, с какого уходят уведомления о долгах.
        </p>
        <select
          id="fo-debt-account"
          className="mt-2 w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">
            {accounts.length === 0
              ? "Нет активных ящиков"
              : "Первый активный ящик"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName ? `${a.displayName} <${a.email}>` : a.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Подстановки
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Кликните поле темы или текста, затем кнопку — токен вставится в курсор.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FINANCE_OFFICE_DEBT_PLACEHOLDERS.map((p) => (
            <button
              key={p.token}
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertPlaceholder(p.token)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-subject"
        >
          Тема письма о долге
        </label>
        <input
          id="fo-debt-subject"
          ref={subjectRef}
          type="text"
          maxLength={500}
          className="mt-2 w-full max-w-2xl rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm"
          value={subject}
          onFocus={() => setFocusField("subject")}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-tpl"
        >
          Текст письма о долге
        </label>
        <textarea
          id="fo-debt-tpl"
          ref={bodyRef}
          rows={10}
          className="mt-2 w-full max-w-2xl rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
          value={template}
          onFocus={() => setFocusField("body")}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-doc-subject"
        >
          Тема письма «отправить документы»
        </label>
        <input
          id="fo-doc-subject"
          ref={docSubjectRef}
          type="text"
          maxLength={500}
          className="mt-2 w-full max-w-2xl rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm"
          value={documentSubject}
          onFocus={() => setFocusField("docSubject")}
          onChange={(e) => setDocumentSubject(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-doc-tpl"
        >
          Текст письма «отправить документы»
        </label>
        <textarea
          id="fo-doc-tpl"
          ref={docBodyRef}
          rows={10}
          className="mt-2 w-full max-w-2xl rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
          value={documentTemplate}
          onFocus={() => setFocusField("docBody")}
          onChange={(e) => setDocumentTemplate(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Сохранено</p>
      ) : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}
