"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type State = {
  hasTemplate: boolean;
  fileName: string;
  updatedAt: string | null;
  placeholders: string[];
};

function emptyState(): State {
  return {
    hasTemplate: false,
    fileName: "",
    updatedAt: null,
    placeholders: [],
  };
}

export function ContractTemplateDirectoryClient() {
  const [state, setState] = useState<State>(emptyState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    const res = await fetch("/api/contract-template", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Ошибка загрузки");
      return;
    }
    setState({
      hasTemplate: Boolean(data.hasTemplate),
      fileName: typeof data.fileName === "string" ? data.fileName : "",
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
      placeholders: Array.isArray(data.placeholders)
        ? data.placeholders.map((x: unknown) => String(x))
        : [],
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/contract-template", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось загрузить");
        setBusy(false);
        return;
      }
      setSuccess("Шаблон договора загружен.");
      await refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--app-text)]">
        Шаблон договора
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Загрузите .docx-шаблон. Поля для подстановки берутся автоматически из
        красного текста в кавычках (без дублей).
      </p>

      <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95">
          {busy ? "Загрузка…" : "Загрузить шаблон"}
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={busy}
            onChange={(e) => void onUpload(e)}
          />
        </label>
        {state.hasTemplate ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Текущий файл:{" "}
            <span className="font-medium text-[var(--app-text)]">{state.fileName}</span>
            {state.updatedAt
              ? ` · обновлён ${new Date(state.updatedAt).toLocaleString("ru-RU")}`
              : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Шаблон пока не загружен.
          </p>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-600">{success}</p> : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">
          Поля подстановки
        </h3>
        {state.placeholders.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            В шаблоне не найдено красных фрагментов в кавычках.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--app-text)]">
            {state.placeholders.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
