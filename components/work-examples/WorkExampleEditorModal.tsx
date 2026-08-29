"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkExampleCardType, WorkExampleItem } from "@/components/work-examples/types";
import { WORK_EXAMPLE_TITLE_MAX } from "@/lib/work-examples/constants";
import { guessWorkExampleAttachKind } from "@/lib/work-examples/guess-attach-kind";

type OrderHit = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
  clinicName?: string;
};

type AttachKind = "PHOTO" | "CAD" | "FILE";

type PendingFile = {
  localId: string;
  kind: AttachKind;
  file: File;
};

export function WorkExampleEditorModal({
  item,
  canDeleteWhole,
  onClose,
  onSaved,
  onShare,
  onDeleteWhole,
}: {
  item: WorkExampleItem | null;
  canDeleteWhole?: boolean;
  onClose: () => void;
  onSaved: (next: WorkExampleItem) => void;
  onShare?: (id: string) => void;
  onDeleteWhole?: (id: string) => void;
}) {
  const isEdit = Boolean(item);
  const [title, setTitle] = useState(item?.title ?? "");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<OrderHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [orderId, setOrderId] = useState(item?.orderId ?? "");
  const [orderLabel, setOrderLabel] = useState(
    item?.orderNumber || (item && !item.orderId ? "не распределен" : ""),
  );
  const [cardTypes, setCardTypes] = useState<WorkExampleCardType[]>(item?.cardTypes ?? []);
  const [allTypes, setAllTypes] = useState<WorkExampleCardType[]>([]);
  const [typesOpen, setTypesOpen] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(item?.cloudUrl ?? "");
  const [tech, setTech] = useState(item?.technicianNotes ?? "");
  const [doc, setDoc] = useState(item?.doctorComments ?? "");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [savedFiles, setSavedFiles] = useState(item?.files ?? []);
  const [savedId, setSavedId] = useState(item?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cadInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queueFiles = (files: File[], forced?: AttachKind) => {
    if (!files.length) return;
    setPending((prev) => [
      ...prev,
      ...files.map((file) => ({
        localId: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        kind: forced ?? guessWorkExampleAttachKind(file),
        file,
      })),
    ]);
  };

  useEffect(() => {
    void fetch("/api/work-examples/card-types", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { items?: WorkExampleCardType[] }) => setAllTypes(j.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchErr(null);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setSearchErr(null);
        try {
          const r = await fetch(
            `/api/work-examples/order-search?q=${encodeURIComponent(needle)}`,
            { credentials: "include", signal: ac.signal },
          );
          const j = (await r.json().catch(() => ({}))) as {
            items?: OrderHit[];
            error?: string;
          };
          if (!r.ok) {
            setSearchErr(j.error || "Не удалось найти наряды");
            setHits([]);
            return;
          }
          setHits(Array.isArray(j.items) ? j.items : []);
        } catch (e) {
          if (ac.signal.aborted) return;
          setSearchErr("Сеть недоступна");
          setHits([]);
        } finally {
          if (!ac.signal.aborted) setSearching(false);
        }
      })();
    }, 280);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  const pickOrder = async (hit: OrderHit | null) => {
    if (!hit) {
      setOrderId("");
      setOrderLabel("не распределен");
      setHits([]);
      return;
    }
    setOrderId(hit.id);
    setOrderLabel(hit.orderNumber);
    setHits([]);
    setQ("");
    const r = await fetch(
      `/api/work-examples/order-preview?orderId=${encodeURIComponent(hit.id)}`,
      { credentials: "include" },
    );
    const j = (await r.json()) as { cardTypes?: WorkExampleCardType[] };
    if (r.ok && j.cardTypes?.length && !cardTypes.length) {
      setCardTypes(j.cardTypes);
    }
  };

  const persistMeta = async (): Promise<WorkExampleItem | null> => {
    const body = {
      title,
      orderId: orderId || null,
      cardTypes,
      cloudUrl,
      technicianNotes: tech,
      doctorComments: doc,
    };
    const id = savedId || item?.id || "";
    const r = await fetch(id ? `/api/work-examples/${id}` : "/api/work-examples", {
      method: id ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json()) as { item?: WorkExampleItem; error?: string };
    if (!r.ok || !j.item) {
      setErr(j.error || "Не удалось сохранить");
      return null;
    }
    setSavedId(j.item.id);
    return j.item;
  };

  const uploadPending = async (exampleId: string): Promise<WorkExampleItem | null> => {
    let latest: WorkExampleItem | null = null;
    for (const kind of ["PHOTO", "CAD", "FILE"] as const) {
      const batch = pending.filter((p) => p.kind === kind);
      if (!batch.length) continue;
      const fd = new FormData();
      fd.set("kind", kind);
      for (const p of batch) fd.append("files", p.file);
      const r = await fetch(`/api/work-examples/${exampleId}/files`, {
        method: "POST",
        credentials: "include",
        body: fd,
        signal: AbortSignal.timeout(55_000),
      });
      const j = (await r.json()) as { item?: WorkExampleItem; error?: string };
      if (!r.ok || !j.item) {
        setErr(j.error || "Не удалось загрузить файлы");
        return latest;
      }
      latest = j.item;
    }
    return latest;
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const next = await persistMeta();
      if (!next) return;
      let saved = next;
      if (pending.length) {
        try {
          const uploaded = await uploadPending(next.id);
          if (!uploaded) {
            onSaved(next);
            return;
          }
          saved = uploaded;
        } catch (e) {
          const aborted =
            e instanceof DOMException &&
            (e.name === "TimeoutError" || e.name === "AbortError");
          setErr(
            aborted
              ? "Загрузка файлов зависла. Попробуйте ещё раз."
              : "Не удалось загрузить файлы",
          );
          onSaved(next);
          return;
        }
      }
      setPending([]);
      setSavedFiles(saved.files);
      onSaved(saved);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const removeSavedFile = async (fileId: string) => {
    const id = savedId || item?.id;
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/work-examples/${id}/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        setErr("Не удалось удалить файл");
        return;
      }
      const g = await fetch(`/api/work-examples/${id}`, { credentials: "include" });
      const j = (await g.json()) as { item?: WorkExampleItem };
      if (j.item) {
        setSavedFiles(j.item.files);
        onSaved(j.item);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        queueFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          queueFiles(Array.from(e.dataTransfer.files));
        }}
        onPaste={(e) => {
          const files: File[] = [];
          for (const item of Array.from(e.clipboardData.items)) {
            if (item.kind === "file") {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
          if (files.length) {
            e.preventDefault();
            queueFiles(files);
          }
        }}
      >
        <header className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Название примера работы</span>
            <input
              className="w-full bg-transparent text-base font-semibold text-[var(--text-strong)] outline-none placeholder:font-semibold placeholder:text-[var(--text-strong)]"
              placeholder="Новый пример работы"
              value={title}
              maxLength={WORK_EXAMPLE_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!isEdit}
            />
          </label>
          <button
            type="button"
            className="shrink-0 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="min-w-0 flex-1">
              <div className="flex min-h-10 items-center rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3">
                <input
                  type="search"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--text-placeholder)]"
                  placeholder="Поиск наряда…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-label="Поиск наряда"
                />
                <span className="ml-2 shrink-0 text-xs text-[var(--text-muted)]">
                  Сейчас: {orderLabel || "не распределен"}
                  {orderId ? (
                    <button
                      type="button"
                      className="ml-1 text-[var(--sidebar-blue)]"
                      onClick={() => void pickOrder(null)}
                    >
                      снять
                    </button>
                  ) : null}
                </span>
              </div>
              {searchErr ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {searchErr}
                </p>
              ) : null}
              {searching && q.trim().length >= 2 ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Поиск…</p>
              ) : null}
              {!searching && q.trim().length >= 2 && hits.length === 0 && !searchErr ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Ничего не найдено</p>
              ) : null}
              {hits.length > 0 ? (
                <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-sm">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)]"
                        onClick={() => void pickOrder(h)}
                      >
                        <span className="font-mono font-semibold">{h.orderNumber}</span>
                        {h.patientName ? ` · ${h.patientName}` : ""}
                        {h.doctorName ? ` · ${h.doctorName}` : ""}
                        {h.clinicName ? ` · ${h.clinicName}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="w-full sm:w-44">
              <button
                type="button"
                className="flex h-full min-h-10 w-full flex-col justify-center rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-left text-sm"
                onClick={() => setTypesOpen((v) => !v)}
              >
                Типы работ
                <span className="text-xs text-[var(--text-muted)]">
                  {cardTypes.map((t) => t.name).join(", ") || "не заданы"}
                </span>
              </button>
              {typesOpen ? (
                <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2 text-sm">
                  {allTypes.map((t) => {
                    const on = cardTypes.some((x) => x.id === t.id);
                    return (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setCardTypes((prev) =>
                                on ? prev.filter((x) => x.id !== t.id) : [...prev, t],
                              )
                            }
                          />
                          {t.name}
                        </label>
                      </li>
                    );
                  })}
                  {!allTypes.length ? (
                    <li className="text-xs text-[var(--text-muted)]">Типы канбана пусты</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3">
              <input
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--text-placeholder)]"
                placeholder="https://…"
                value={cloudUrl}
                onChange={(e) => setCloudUrl(e.target.value)}
                aria-label="Ссылка на облако"
              />
              <span className="ml-2 shrink-0 text-xs text-[var(--text-muted)]">
                Прикрепите ссылку
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-2.5 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                onClick={() => photoInputRef.current?.click()}
              >
                + фото
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-2.5 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                onClick={() => cadInputRef.current?.click()}
              >
                + проект кад
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-2.5 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                onClick={() => fileInputRef.current?.click()}
              >
                + файлы
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => {
                queueFiles(Array.from(e.target.files ?? []), "PHOTO");
                e.target.value = "";
              }}
            />
            <input
              ref={cadInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".stl,.ply,.obj,.html,.htm,.3mf,.zip,.drc"
              onChange={(e) => {
                queueFiles(Array.from(e.target.files ?? []), "CAD");
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                queueFiles(Array.from(e.target.files ?? []), "FILE");
                e.target.value = "";
              }}
            />
          </div>

          {pending.length || savedFiles.length ? (
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {savedFiles.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2">
                  <span>в примере: {f.fileName}</span>
                  <button
                    type="button"
                    className="text-red-600"
                    disabled={busy}
                    onClick={() => void removeSavedFile(f.id)}
                  >
                    удалить
                  </button>
                </li>
              ))}
              {pending.map((p) => (
                <li key={p.localId} className="flex items-center justify-between gap-2">
                  <span>к сохранению: {p.file.name}</span>
                  <button
                    type="button"
                    className="text-[var(--sidebar-blue)]"
                    onClick={() =>
                      setPending((prev) => prev.filter((x) => x.localId !== p.localId))
                    }
                  >
                    убрать
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Описание от техника
              </span>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Комментарии от доктора
              </span>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
              />
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-[var(--card-border)] px-4 py-3">
          <div className="flex gap-2">
            {savedId ? (
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm"
                onClick={() => onShare?.(savedId)}
              >
                QR
              </button>
            ) : null}
            {savedId && canDeleteWhole ? (
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-red-600"
                onClick={() => onDeleteWhole?.(savedId)}
              >
                Удалить
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg px-3 py-1.5 text-sm" onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void save()}
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
