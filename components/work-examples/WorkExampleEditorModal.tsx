"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WorkExampleHtmlViewer } from "@/components/work-examples/WorkExampleHtmlViewer";
import { WorkExampleMeshViewer } from "@/components/work-examples/WorkExampleMeshViewer";
import type { WorkExampleCardType, WorkExampleItem } from "@/components/work-examples/types";
import {
  cloudFolderProviderLabel,
  isImportableCloudFolderUrl,
  parseCloudFolderImportUrl,
} from "@/lib/work-examples/cloud-folder-url";
import {
  parseWorkExampleCloudUrls,
  serializeWorkExampleCloudUrls,
  splitWorkExampleCloudUrlDraft,
  WORK_EXAMPLE_CLOUD_URL_MAX,
} from "@/lib/work-examples/cloud-urls";
import { WORK_EXAMPLE_TITLE_MAX } from "@/lib/work-examples/constants";
import { guessWorkExampleAttachKind } from "@/lib/work-examples/guess-attach-kind";
import {
  formatWorkExampleUploadHttpError,
  isWorkExampleFileOverLimit,
  workExampleFileTooLargeMessage,
  workExampleUploadTimeoutMs,
} from "@/lib/work-examples/upload-client";
import {
  isWorkExampleViewableHtml,
  isWorkExampleViewableMesh,
} from "@/lib/work-examples/mesh-file";

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
  const [cloudUrls, setCloudUrls] = useState<string[]>(() => {
    const parsed = parseWorkExampleCloudUrls(item?.cloudUrl ?? "");
    return parsed.length ? parsed : [""];
  });
  const [tech, setTech] = useState(item?.technicianNotes ?? "");
  const [doc, setDoc] = useState(item?.doctorComments ?? "");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [savedFiles, setSavedFiles] = useState(item?.files ?? []);
  const [savedId, setSavedId] = useState(item?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNote, setCloudNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const importedCloudRef = useRef<Set<string>>(new Set());
  const skipCloudAutoRef = useRef(true);
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

  const setCloudUrlAt = (index: number, raw: string) => {
    const split = splitWorkExampleCloudUrlDraft(raw);
    setCloudUrls((prev) => {
      if (split) {
        const next = [...prev.slice(0, index), ...split, ...prev.slice(index + 1)];
        return next.slice(0, WORK_EXAMPLE_CLOUD_URL_MAX);
      }
      const next = [...prev];
      next[index] = raw;
      return next;
    });
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

  useEffect(() => {
    if (skipCloudAutoRef.current) {
      skipCloudAutoRef.current = false;
      return;
    }
    const fresh = cloudUrls
      .map((u) => u.trim())
      .filter((u) => {
        const key = cloudImportKey(u);
        return key != null && !importedCloudRef.current.has(key);
      });
    if (!fresh.length) return;
    const t = window.setTimeout(() => {
      void pullCloudNow(fresh);
    }, 700);
    return () => window.clearTimeout(t);
  }, [cloudUrls]);

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
      cloudUrl: serializeWorkExampleCloudUrls(cloudUrls),
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

  const cloudImportKey = (url: string): string | null => {
    const t = parseCloudFolderImportUrl(url);
    if (!t) return null;
    return (t.yandexPublicUrl || t.driveId || url).toLowerCase();
  };

  const importCloudFolders = async (
    exampleId: string,
    urls: string[],
  ): Promise<WorkExampleItem | null> => {
    let latest: WorkExampleItem | null = null;
    const notes: string[] = [];
    for (const url of urls) {
      const target = parseCloudFolderImportUrl(url);
      if (!target) continue;
      const key = cloudImportKey(url);
      setCloudNote(`Забираю фото с ${cloudFolderProviderLabel(target.provider)}…`);
      try {
        const r = await fetch(`/api/work-examples/${exampleId}/cloud-import`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderUrl: url }),
          signal: AbortSignal.timeout(180_000),
        });
        const j = (await r.json().catch(() => ({}))) as {
          item?: WorkExampleItem;
          imported?: number;
          skipped?: number;
          truncated?: boolean;
          error?: string;
          errors?: string[];
        };
        if (j.item) {
          latest = j.item;
          setSavedFiles(j.item.files);
          setSavedId(j.item.id);
          if (j.item.title) {
            setTitle((prev) => prev.trim() || j.item!.title);
          }
        }
        if (!r.ok) {
          notes.push(j.error || "Не удалось забрать фото");
          continue;
        }
        if (key) importedCloudRef.current.add(key);
        const parts: string[] = [];
        if (j.imported) parts.push(`забрано ${j.imported}`);
        if (j.skipped) parts.push(`уже были ${j.skipped}`);
        if (j.truncated) parts.push("лимит 40 за раз");
        notes.push(
          parts.length
            ? `${cloudFolderProviderLabel(target.provider)}: ${parts.join(", ")}`
            : `${cloudFolderProviderLabel(target.provider)}: готово`,
        );
        if (j.errors?.length) notes.push(j.errors.slice(0, 3).join(" · "));
      } catch {
        notes.push("Сеть недоступна при загрузке из облака");
      }
    }
    setCloudNote(notes.filter(Boolean).join(" · ") || null);
    return latest;
  };

  const pullCloudNow = async (urls?: string[]) => {
    const list = (urls ?? cloudUrls).map((u) => u.trim()).filter(isImportableCloudFolderUrl);
    if (!list.length) {
      setCloudNote("Вставьте ссылку на папку Google Drive или Яндекс Диска");
      return;
    }
    setCloudBusy(true);
    setErr(null);
    try {
      const next = await persistMeta();
      if (!next) return;
      const imported = await importCloudFolders(next.id, list);
      if (imported) onSaved(imported);
    } catch {
      setErr("Не удалось забрать фото из облака");
    } finally {
      setCloudBusy(false);
    }
  };

  const uploadPending = async (
    exampleId: string,
  ): Promise<{ item: WorkExampleItem | null; errors: string[]; doneLocalIds: string[] }> => {
    let latest: WorkExampleItem | null = null;
    const errors: string[] = [];
    const doneLocalIds: string[] = [];
    for (const p of pending) {
      if (isWorkExampleFileOverLimit(p.file.size)) {
        errors.push(workExampleFileTooLargeMessage(p.file.name));
        continue;
      }
      const fd = new FormData();
      fd.set("kind", p.kind);
      fd.append("files", p.file);
      try {
        const r = await fetch(`/api/work-examples/${exampleId}/files`, {
          method: "POST",
          credentials: "include",
          body: fd,
          signal: AbortSignal.timeout(workExampleUploadTimeoutMs(p.file.size)),
        });
        const raw = await r.text();
        let j: { item?: WorkExampleItem; error?: string } = {};
        try {
          j = raw.trim() ? (JSON.parse(raw) as { item?: WorkExampleItem; error?: string }) : {};
        } catch {
          j = {};
        }
        if (!r.ok || !j.item) {
          errors.push(
            formatWorkExampleUploadHttpError(
              r.status,
              j as Record<string, unknown>,
              raw,
              p.file.name,
            ),
          );
          continue;
        }
        latest = j.item;
        doneLocalIds.push(p.localId);
      } catch (e) {
        const aborted =
          e instanceof DOMException &&
          (e.name === "TimeoutError" || e.name === "AbortError");
        errors.push(
          aborted
            ? `«${p.file.name}»: загрузка зависла. Попробуйте ещё раз.`
            : `«${p.file.name}»: сеть недоступна`,
        );
      }
    }
    return { item: latest, errors, doneLocalIds };
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const next = await persistMeta();
      if (!next) return;
      let saved = next;
      if (pending.length) {
        const uploaded = await uploadPending(next.id);
        if (uploaded.doneLocalIds.length) {
          setPending((prev) => prev.filter((x) => !uploaded.doneLocalIds.includes(x.localId)));
        }
        if (uploaded.item) {
          saved = uploaded.item;
          setSavedFiles(uploaded.item.files);
        }
        if (uploaded.errors.length) {
          setErr(uploaded.errors.join(" · "));
          onSaved(saved);
          return;
        }
      }
      const freshCloud = cloudUrls
        .map((u) => u.trim())
        .filter((u) => {
          const key = cloudImportKey(u);
          return key != null && !importedCloudRef.current.has(key);
        });
      if (freshCloud.length) {
        const imported = await importCloudFolders(next.id, freshCloud);
        if (imported) {
          saved = imported;
          setSavedFiles(imported.files);
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 isolate z-[400] flex items-center justify-center bg-black/55 p-3 sm:p-6"
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
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
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
            <div className="relative w-full shrink-0 sm:w-44">
              <button
                type="button"
                className="flex min-h-10 w-full flex-col justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-left text-sm"
                onClick={() => setTypesOpen((v) => !v)}
              >
                Типы работ
                <span className="truncate text-xs text-[var(--text-muted)]">
                  {cardTypes.map((t) => t.name).join(", ") || "не заданы"}
                </span>
              </button>
              {typesOpen ? (
                <ul className="relative z-20 mt-1 max-h-48 overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2 text-sm shadow-lg">
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

          <div className="shrink-0 space-y-1.5">
            {cloudUrls.map((href, i) => (
              <div
                key={`cloud-${i}`}
                className="flex min-h-10 min-w-0 items-center rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3"
              >
                <input
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--text-placeholder)]"
                  placeholder="папка Яндекс Диска или Google Drive…"
                  value={href}
                  onChange={(e) => setCloudUrlAt(i, e.target.value)}
                  aria-label={i === 0 ? "Ссылка на облако" : `Ссылка на облако ${i + 1}`}
                />
                {isImportableCloudFolderUrl(href) ? (
                  <button
                    type="button"
                    className="ml-2 shrink-0 text-xs text-[var(--sidebar-blue)] disabled:opacity-50"
                    disabled={busy || cloudBusy}
                    onClick={() => void pullCloudNow([href])}
                  >
                    забрать
                  </button>
                ) : null}
                {cloudUrls.length > 1 ? (
                  <button
                    type="button"
                    className="ml-2 shrink-0 text-xs text-[var(--sidebar-blue)]"
                    onClick={() =>
                      setCloudUrls((prev) => {
                        const next = prev.filter((_, j) => j !== i);
                        return next.length ? next : [""];
                      })
                    }
                  >
                    убрать
                  </button>
                ) : !isImportableCloudFolderUrl(href) ? (
                  <span className="ml-2 shrink-0 text-xs text-[var(--text-muted)]">
                    Ссылка
                  </span>
                ) : null}
              </div>
            ))}
            {cloudUrls.length < WORK_EXAMPLE_CLOUD_URL_MAX ? (
              <button
                type="button"
                className="flex min-h-10 w-full items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
                onClick={() => setCloudUrls((prev) => [...prev, ""])}
              >
                + ещё ссылка
              </button>
            ) : null}
            {cloudNote ? (
              <p className="text-xs text-[var(--text-muted)]">{cloudNote}</p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Из папки заберу только фото с именами; архивы, КТ и прочее останутся по ссылке
              </p>
            )}
          </div>

          <div className="grid min-h-[10rem] flex-1 grid-cols-3 gap-1.5">
            <button
              type="button"
              className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] px-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
              onClick={() => photoInputRef.current?.click()}
            >
              + фото
              <span className="mt-1 text-center text-[11px] font-normal text-[var(--text-muted)]">
                перетащите сюда
              </span>
            </button>
            <button
              type="button"
              className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] px-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
              onClick={() => cadInputRef.current?.click()}
            >
              + проект кад
              <span className="mt-1 text-center text-[11px] font-normal text-[var(--text-muted)]">
                перетащите сюда
              </span>
            </button>
            <button
              type="button"
              className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] px-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
              onClick={() => fileInputRef.current?.click()}
            >
              + файлы
              <span className="mt-1 text-center text-[11px] font-normal text-[var(--text-muted)]">
                перетащите сюда
              </span>
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

          {savedId && savedFiles.some((f) => isWorkExampleViewableMesh(f.fileName)) ? (
            <WorkExampleMeshViewer
              meshes={savedFiles
                .filter((f) => isWorkExampleViewableMesh(f.fileName))
                .map((f) => ({
                  url: `/api/work-examples/${encodeURIComponent(savedId)}/files/${encodeURIComponent(f.id)}`,
                  fileName: f.fileName,
                }))}
            />
          ) : null}
          {savedId
            ? savedFiles
                .filter((f) => isWorkExampleViewableHtml(f.fileName))
                .map((f) => (
                  <WorkExampleHtmlViewer
                    key={f.id}
                    url={`/api/work-examples/${encodeURIComponent(savedId)}/files/${encodeURIComponent(f.id)}`}
                    convertUrl={`/api/work-examples/${encodeURIComponent(savedId)}/files/${encodeURIComponent(f.id)}/d3d`}
                    fileName={f.fileName}
                  />
                ))
            : null}

          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
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
              disabled={busy || cloudBusy}
              className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void save()}
            >
              {cloudBusy ? "Забираю фото…" : busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
