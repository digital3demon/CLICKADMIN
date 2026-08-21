"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClickMigScanViewer } from "@/components/clickmig/ClickMigScanViewer";
import { PriceListLineToothModal } from "@/components/orders/new-order-form/PriceListLineToothModal";

type PublicConfig = {
  constructionTypes: { key: string; name: string; requiresScanbody?: boolean }[];
  scanbodyManufacturers: string[];
  shadeOptions: { group: string; codes: string[] };
  materials: string[];
  validationHints: { field: string; label: string; whyImportant: string; required: boolean }[];
};

/** Ключ не кладём в бандл: на CRM/form-хосте API доверяет Host. */

const inputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-[var(--app-text)]";

type Props = {
  /** Встроена во вкладку CRM (/clickmig?tab=form). */
  embedded?: boolean;
};

export function ClickMigPublicForm({ embedded = false }: Props) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<Set<string>>(new Set());
  const [toothModalOpen, setToothModalOpen] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [hints, setHints] = useState<
    Array<{ field: string; label: string; whyImportant: string; filled: boolean; required: boolean }>
  >([]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    patientName: "",
    doctorName: "",
    doctorEmail: "",
    clinic: "",
    address: "",
    constructionTypeKey: "",
    material: "ZIRCONIA",
    screwRetained: false,
    scanbodyManufacturer: "",
    shadeCode: "",
    shadeDetail: "",
    clientNotes: "",
    photoLinks: "",
    scanLinks: "",
  });

  useEffect(() => {
    void fetch("/api/clickmig/public/config")
      .then((r) => r.json())
      .then((d) => setConfig(d as PublicConfig));
  }, []);

  const previewUrls = useMemo(
    () => scanFiles.map((f) => URL.createObjectURL(f)),
    [scanFiles],
  );

  useEffect(() => {
    return () => {
      for (const u of previewUrls) URL.revokeObjectURL(u);
    };
  }, [previewUrls]);

  const validate = useCallback(async () => {
    const teethFdi = [...selectedTeeth].sort();
    const res = await fetch("/api/clickmig/public/applications/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        teethFdi,
        photoFileCount: photoFiles.length + (form.photoLinks ? 1 : 0),
        scanFileCount: scanFiles.length + (form.scanLinks ? 1 : 0),
        photoLinks: form.photoLinks.split("\n").filter(Boolean),
        scanLinks: form.scanLinks.split("\n").filter(Boolean),
      }),
    });
    const data = (await res.json()) as { hints: typeof hints; valid: boolean };
    setHints(data.hints ?? []);
    return data.valid;
  }, [form, photoFiles.length, scanFiles.length, selectedTeeth]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await validate();
    if (!ok) {
      setBusy(false);
      return;
    }
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === "boolean") fd.set(k, v ? "true" : "false");
      else fd.set(k, v);
    }
    fd.set("teethFdi", JSON.stringify([...selectedTeeth].sort()));
    fd.set("photoLinks", JSON.stringify(form.photoLinks.split("\n").filter(Boolean)));
    fd.set("scanLinks", JSON.stringify(form.scanLinks.split("\n").filter(Boolean)));
    for (const f of photoFiles) fd.append("photo", f);
    for (const f of scanFiles) fd.append("scan", f);

    const res = await fetch("/api/clickmig/public/applications", {
      method: "POST",
      body: fd,
    });
    const data = (await res.json()) as { publicNumber?: string; error?: string; hints?: typeof hints };
    if (!res.ok) {
      if (data.hints) setHints(data.hints);
      setBusy(false);
      return;
    }
    setSubmitted(data.publicNumber ?? "OK");
    setBusy(false);
  }

  function resetForm() {
    setSubmitted(null);
    setHints([]);
    setSelectedTeeth(new Set());
    setPhotoFiles([]);
    setScanFiles([]);
    setForm({
      patientName: "",
      doctorName: "",
      doctorEmail: "",
      clinic: "",
      address: "",
      constructionTypeKey: "",
      material: "ZIRCONIA",
      screwRetained: false,
      scanbodyManufacturer: "",
      shadeCode: "",
      shadeDetail: "",
      clientNotes: "",
      photoLinks: "",
      scanLinks: "",
    });
  }

  const Wrapper = embedded ? "div" : "main";
  const wrapperClass = embedded
    ? "mx-auto max-w-2xl space-y-4"
    : "mx-auto max-w-2xl space-y-6 p-6";

  if (submitted) {
    return (
      <Wrapper className={embedded ? "mx-auto max-w-lg space-y-3" : "mx-auto max-w-lg p-6"}>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Заявка отправлена</h2>
        <p className="text-sm text-[var(--text-secondary)]">Номер: {submitted}</p>
        {embedded ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/clickmig"
              className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-2 text-sm text-white"
            >
              К заявкам
            </Link>
            <button
              type="button"
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
              onClick={resetForm}
            >
              Ещё одна заявка
            </button>
          </div>
        ) : null}
      </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClass}>
      {!embedded ? (
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">КликМиг — заказ</h1>
      ) : null}
      <form className="space-y-4" onSubmit={(e) => void submit(e)}>
        <input
          required
          placeholder="ФИО пациента"
          className={inputClass}
          value={form.patientName}
          onChange={(e) => setForm({ ...form, patientName: e.target.value })}
        />
        <input
          required
          placeholder="ФИО врача"
          className={inputClass}
          value={form.doctorName}
          onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className={inputClass}
          value={form.doctorEmail}
          onChange={(e) => setForm({ ...form, doctorEmail: e.target.value })}
        />
        <input
          placeholder="Клиника"
          className={inputClass}
          value={form.clinic}
          onChange={(e) => setForm({ ...form, clinic: e.target.value })}
        />
        <input
          placeholder="Адрес"
          className={inputClass}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        <select
          required
          className={inputClass}
          value={form.constructionTypeKey}
          onChange={(e) =>
            setForm({ ...form, constructionTypeKey: e.target.value })
          }
        >
          <option value="">Тип конструкции</option>
          {config?.constructionTypes.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={form.material}
          onChange={(e) => setForm({ ...form, material: e.target.value })}
        >
          <option value="ZIRCONIA">Циркон</option>
          <option value="EMAX">E.max</option>
          <option value="PMMA">ПММА</option>
          <option value="COMPOSITE">Композит</option>
        </select>

        <button
          type="button"
          className="rounded border border-[var(--card-border)] px-3 py-2 text-sm"
          onClick={() => setToothModalOpen(true)}
        >
          Зубы: {[...selectedTeeth].sort().join(", ") || "выбрать"}
        </button>

        <select
          className={inputClass}
          value={form.shadeCode}
          onChange={(e) => setForm({ ...form, shadeCode: e.target.value })}
        >
          <option value="">Цвет (VITA A/C)</option>
          {config?.shadeOptions.codes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          placeholder="Уточнение цвета"
          className={inputClass}
          value={form.shadeDetail}
          onChange={(e) => setForm({ ...form, shadeDetail: e.target.value })}
        />

        <label className="flex items-center gap-2 text-sm text-[var(--app-text)]">
          <input
            type="checkbox"
            checked={form.screwRetained}
            onChange={(e) => setForm({ ...form, screwRetained: e.target.checked })}
          />
          Винтовая фиксация
        </label>
        {form.screwRetained && (
          <select
            className={inputClass}
            value={form.scanbodyManufacturer}
            onChange={(e) =>
              setForm({ ...form, scanbodyManufacturer: e.target.value })
            }
          >
            <option value="">Scanbody</option>
            {config?.scanbodyManufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        <textarea
          placeholder="Задание от клиента"
          className={inputClass}
          rows={3}
          value={form.clientNotes}
          onChange={(e) => setForm({ ...form, clientNotes: e.target.value })}
        />

        <div>
          <label className="text-sm font-medium text-[var(--app-text)]">Фото</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-sm"
            onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
          />
          <textarea
            placeholder="Ссылки на фото (по одной на строку)"
            className={`mt-2 ${inputClass} text-sm`}
            rows={2}
            value={form.photoLinks}
            onChange={(e) => setForm({ ...form, photoLinks: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--app-text)]">
            Сканы (STL/PLY/OBJ/ZIP)
          </label>
          <input
            type="file"
            multiple
            className="mt-1 block w-full text-sm"
            onChange={(e) => setScanFiles(Array.from(e.target.files ?? []))}
          />
          <textarea
            placeholder="Ссылки на сканы"
            className={`mt-2 ${inputClass} text-sm`}
            rows={2}
            value={form.scanLinks}
            onChange={(e) => setForm({ ...form, scanLinks: e.target.value })}
          />
        </div>

        {scanFiles.length > 0 && (
          <ClickMigScanViewer
            meshUrls={previewUrls.filter((_, i) =>
              /\.(stl|ply|obj)$/i.test(scanFiles[i]?.name ?? ""),
            )}
          />
        )}

        {hints.some((h) => h.required && !h.filled) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
            <p className="font-medium">Заполните важные поля:</p>
            <ul className="mt-2 list-disc pl-5">
              {hints
                .filter((h) => h.required && !h.filled)
                .map((h) => (
                  <li key={h.field}>
                    <strong>{h.label}</strong> — {h.whyImportant}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--sidebar-blue)] py-2.5 text-white disabled:opacity-50"
        >
          {busy ? "Отправка…" : "Отправить заказ"}
        </button>
      </form>

      {toothModalOpen && (
        <PriceListLineToothModal
          open={toothModalOpen}
          title="работа"
          initialTeeth={[...selectedTeeth]}
          onClose={() => setToothModalOpen(false)}
          onCommit={(teeth) => {
            setSelectedTeeth(new Set(teeth));
            setToothModalOpen(false);
          }}
        />
      )}
    </Wrapper>
  );
}
