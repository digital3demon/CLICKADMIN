"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type State = {
  hasTemplate: boolean;
  hasPdf: boolean;
  hasDocx: boolean;
  pdfFileName: string;
  docxFileName: string;
  updatedAt: string | null;
  placeholders: string[];
};

function emptyState(): State {
  return {
    hasTemplate: false,
    hasPdf: false,
    hasDocx: false,
    pdfFileName: "",
    docxFileName: "",
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
      hasPdf: Boolean(data.hasPdf),
      hasDocx: Boolean(data.hasDocx),
      pdfFileName: typeof data.pdfFileName === "string" ? data.pdfFileName : "",
      docxFileName: typeof data.docxFileName === "string" ? data.docxFileName : "",
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
      placeholders: Array.isArray(data.placeholders)
        ? data.placeholders.map((x: unknown) => String(x))
        : [],
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onUpload = async (pdf: File | null, docx: File | null) => {
    if (!pdf && !docx) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      if (pdf) form.set("pdf", pdf);
      if (docx) form.set("docx", docx);
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

  const onPdfChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) void onUpload(file, null);
  };

  const onDocxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) void onUpload(null, file);
  };

  const onBothChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    let pdf: File | null = null;
    let docx: File | null = null;
    for (const f of list) {
      if (/\.pdf$/i.test(f.name)) pdf = f;
      if (/\.docx$/i.test(f.name)) docx = f;
    }
    await onUpload(pdf, docx);
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--app-text)]">
        Шаблон договора
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Основной формат — <strong>PDF с полями формы</strong> (Legal Design, синие
        акценты): после генерации поля можно править в Acrobat. Опционально —
        <strong> DOCX</strong> для правок в Word (плейсхолдеры — синий или
        красный текст в «кавычках»).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95">
          {busy ? "Загрузка…" : "Загрузить PDF"}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={onPdfChange}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-body)] hover:bg-[var(--table-row-hover)]">
          DOCX (опц.)
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={busy}
            onChange={onDocxChange}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[var(--sidebar-blue)] px-3 py-2 text-sm text-[var(--sidebar-blue)] hover:bg-[var(--surface-subtle)]">
          PDF + DOCX
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            multiple
            disabled={busy}
            onChange={(e) => void onBothChange(e)}
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
        {state.hasTemplate ? (
          <ul className="space-y-1">
            {state.hasPdf ? (
              <li>
                PDF:{" "}
                <span className="font-medium text-[var(--app-text)]">
                  {state.pdfFileName || "typical-contract-ooo.pdf"}
                </span>
              </li>
            ) : (
              <li>PDF: используется файл из data/templates/ по умолчанию</li>
            )}
            {state.hasDocx ? (
              <li>
                DOCX:{" "}
                <span className="font-medium text-[var(--app-text)]">
                  {state.docxFileName}
                </span>
              </li>
            ) : (
              <li>DOCX: не загружен</li>
            )}
            {state.updatedAt ? (
              <li className="text-[var(--text-muted)]">
                Обновлён {new Date(state.updatedAt).toLocaleString("ru-RU")}
              </li>
            ) : null}
          </ul>
        ) : (
          <p>Шаблон в настройках тенанта пока не задан — будет использован PDF из репозитория.</p>
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
            Поля не найдены — проверьте AcroForm в PDF или маркеры в DOCX.
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
