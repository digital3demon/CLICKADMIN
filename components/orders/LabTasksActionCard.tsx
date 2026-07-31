"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { formatRuDateTime, ordersHistoryHref } from "@/lib/corrections-history";
import type { LabTaskJson } from "@/lib/lab-tasks";
import { isAllowedLabTaskImageMime, LAB_TASK_MAX_ATTACHMENTS } from "@/lib/lab-tasks";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50 sm:min-w-[13rem]"
    : "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06] sm:min-w-[13rem]";
}

type DraftFile = { id: string; file: File; previewUrl: string };

export function LabTasksActionCard({
  initialPendingCount = 0,
  canResolve = false,
  className = "",
}: {
  initialPendingCount?: number;
  canResolve?: boolean;
  className?: string;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [items, setItems] = useState<LabTaskJson[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDoneId, setConfirmDoneId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [canResolveLive, setCanResolveLive] = useState(canResolve);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftFilesRef = useRef(draftFiles);
  draftFilesRef.current = draftFiles;

  useEffect(() => {
    setPendingCount(initialPendingCount);
  }, [initialPendingCount]);

  useEffect(() => {
    return () => {
      for (const d of draftFilesRef.current) URL.revokeObjectURL(d.previewUrl);
    };
  }, []);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/lab-tasks?status=pending", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        items?: LabTaskJson[];
        pendingCount?: number;
        canResolve?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить");
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      if (typeof j.pendingCount === "number") setPendingCount(j.pendingCount);
      if (typeof j.canResolve === "boolean") setCanResolveLive(j.canResolve);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmDoneId(null);
      return;
    }
    void loadPending();
  }, [open, loadPending]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).filter((f) =>
      isAllowedLabTaskImageMime(f.type || ""),
    );
    if (incoming.length === 0) return;
    setDraftFiles((prev) => {
      const room = LAB_TASK_MAX_ATTACHMENTS - prev.length;
      if (room <= 0) return prev;
      const next = incoming.slice(0, room).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDraftFiles((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => isAllowedLabTaskImageMime(f.type || ""))) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const sendTask = useCallback(async () => {
    const bodyText = text.trim();
    if (!bodyText && draftFiles.length === 0) {
      setErr("Введите текст или вставьте картинку");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("text", bodyText);
      for (const d of draftFiles) fd.append("files", d.file, d.file.name);
      const res = await fetch("/api/lab-tasks", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as {
        items?: LabTaskJson[];
        pendingCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось создать задачу");
        return;
      }
      setText("");
      for (const d of draftFiles) URL.revokeObjectURL(d.previewUrl);
      setDraftFiles([]);
      setItems(Array.isArray(j.items) ? j.items : []);
      if (typeof j.pendingCount === "number") setPendingCount(j.pendingCount);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setSending(false);
    }
  }, [text, draftFiles]);

  const resolveTask = useCallback(async (taskId: string) => {
    setBusyId(taskId);
    setErr(null);
    try {
      const res = await fetch(`/api/lab-tasks/${encodeURIComponent(taskId)}/resolve`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        items?: LabTaskJson[];
        pendingCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось отметить");
        setConfirmDoneId(null);
        return;
      }
      setConfirmDoneId(null);
      setItems(Array.isArray(j.items) ? j.items : []);
      if (typeof j.pendingCount === "number") setPendingCount(j.pendingCount);
    } catch {
      setErr("Сеть недоступна");
      setConfirmDoneId(null);
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        className={`${cardShell(isHarmony)} ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="text-sm font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
          Задачи
        </span>
        <span className="flex items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Нерешённые
          </span>
          <span
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
            aria-label={`Нерешённых задач: ${pendingCount}`}
          >
            {pendingCount}
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Задачи"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-violet-600 dark:text-violet-400">
                Задачи · нерешённые
              </h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
              {err ? (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              {loading ? (
                <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Нет нерешённых задач. Создайте ниже.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--text-muted)]">
                            от {row.authorLabel}
                            <span className="ml-1.5 font-normal">
                              · {formatRuDateTime(new Date(row.createdAt))}
                            </span>
                          </p>
                          {row.text.trim() ? (
                            <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">
                              {row.text}
                            </p>
                          ) : null}
                          {row.attachments.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {row.attachments.map((a) => (
                                <a
                                  key={a.id}
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-md border border-[var(--card-border)]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={a.url}
                                    alt={a.fileName}
                                    className="h-20 w-20 object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {canResolveLive ? (
                          <button
                            type="button"
                            className={
                              confirmDoneId === row.id
                                ? "shrink-0 rounded-md border border-emerald-400/90 bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-950 shadow-sm hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                                : "shrink-0 rounded-md border border-sky-300/80 bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/55"
                            }
                            disabled={busyId === row.id}
                            title={
                              confirmDoneId === row.id
                                ? "Подтвердить: задача выполнена"
                                : "Отметить задачу готовой"
                            }
                            onClick={() => {
                              if (confirmDoneId === row.id) {
                                void resolveTask(row.id);
                                return;
                              }
                              setConfirmDoneId(row.id);
                              setErr(null);
                            }}
                          >
                            {busyId === row.id
                              ? "…"
                              : confirmDoneId === row.id
                                ? "Точно?"
                                : "Готово"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="border-t border-[var(--card-border)] px-4 py-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {draftFiles.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {draftFiles.map((d) => (
                    <div key={d.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.previewUrl}
                        alt=""
                        className="h-14 w-14 rounded-md border border-[var(--card-border)] object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-black/70 px-1 text-[10px] text-white"
                        onClick={() => removeDraft(d.id)}
                        aria-label="Убрать картинку"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <textarea
                className="min-h-[4.5rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--text-muted)]"
                placeholder="Новая задача… Можно вставить или перетащить картинки"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={onPaste}
                rows={3}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-md border border-[var(--input-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Картинка
                  </button>
                  <Link
                    href={ordersHistoryHref({ tab: "tasks" })}
                    className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    Вся история задач →
                  </Link>
                </div>
                <button
                  type="button"
                  disabled={sending}
                  className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  onClick={() => void sendTask()}
                >
                  {sending ? "Отправка…" : "Отправить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
