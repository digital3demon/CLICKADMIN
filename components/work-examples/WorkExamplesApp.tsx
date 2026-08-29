"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  ImageLightbox,
  type ImageLightboxState,
} from "@/components/ui/ImageLightbox";
import { WorkExampleEditorModal } from "@/components/work-examples/WorkExampleEditorModal";
import { WorkExampleHtmlViewer } from "@/components/work-examples/WorkExampleHtmlViewer";
import { WorkExampleMeshViewer } from "@/components/work-examples/WorkExampleMeshViewer";
import {
  workExampleDisplayTitle,
  type WorkExampleItem,
} from "@/components/work-examples/types";
import {
  isWorkExampleViewableHtml,
  isWorkExampleViewableMesh,
} from "@/lib/work-examples/mesh-file";

function fileUrl(exampleId: string, fileId: string) {
  return `/api/work-examples/${encodeURIComponent(exampleId)}/files/${encodeURIComponent(fileId)}`;
}

export function WorkExamplesApp() {
  const [items, setItems] = useState<WorkExampleItem[]>([]);
  const [canDeleteWhole, setCanDeleteWhole] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editor, setEditor] = useState<WorkExampleItem | null | "new">(null);
  const [view, setView] = useState<WorkExampleItem | null>(null);
  const [share, setShare] = useState<{ url: string; qr: string | null } | null>(null);
  const [lightbox, setLightbox] = useState<ImageLightboxState | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/work-examples", { credentials: "include" });
    const j = (await r.json()) as {
      items?: WorkExampleItem[];
      canDeleteWhole?: boolean;
      error?: string;
    };
    if (!r.ok) {
      setErr(j.error || "Не удалось загрузить");
      return;
    }
    setItems(j.items ?? []);
    setCanDeleteWhole(j.canDeleteWhole === true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = (next: WorkExampleItem) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === next.id);
      if (i < 0) return [next, ...prev];
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
    setView((v) => (v?.id === next.id ? next : v));
  };

  const openShare = async (id: string) => {
    const r = await fetch(`/api/work-examples/${id}/share`, { credentials: "include" });
    const j = (await r.json()) as { url?: string; error?: string };
    if (!r.ok || !j.url) {
      setErr(j.error || "Нет ссылки");
      return;
    }
    let qr: string | null = null;
    try {
      const QRCode = (await import("qrcode")).default;
      qr = await QRCode.toDataURL(j.url, { width: 256, margin: 2, errorCorrectionLevel: "M" });
    } catch {
      qr = null;
    }
    setShare({ url: j.url, qr });
  };

  const removeFile = async (exampleId: string, fileId: string) => {
    if (!window.confirm("Удалить файл в корзину на 5 дней?")) return;
    const r = await fetch(`/api/work-examples/${exampleId}/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) return;
    const g = await fetch(`/api/work-examples/${exampleId}`, { credentials: "include" });
    const j = (await g.json()) as { item?: WorkExampleItem };
    if (j.item) upsert(j.item);
  };

  const removeLink = async (it: WorkExampleItem) => {
    if (!window.confirm("Удалить ссылку в корзину на 5 дней?")) return;
    const r = await fetch(`/api/work-examples/${it.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloudUrl: "" }),
    });
    const j = (await r.json()) as { item?: WorkExampleItem };
    if (j.item) upsert(j.item);
  };

  const restore = async (body: Record<string, string>) => {
    await fetch("/api/work-examples/trash", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const g = await fetch(`/api/work-examples/${body.exampleId}`, { credentials: "include" });
    const j = (await g.json()) as { item?: WorkExampleItem };
    if (j.item) upsert(j.item);
  };

  const removeWhole = async (id: string) => {
    if (!window.confirm("Удалить весь пример работы в корзину на 5 дней?")) return;
    const r = await fetch(`/api/work-examples/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setView(null);
    }
  };

  return (
    <ModuleFrame
      title="Примеры работ"
      description="Портфолио лаборатории: фото, КАД, файлы и ссылка. По QR — витрина без номера наряда и фамилий."
      titleBesideEnd={
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-[var(--sidebar-blue)] text-lg font-semibold leading-none text-white hover:bg-[var(--sidebar-blue-hover)]"
          aria-label="Добавить пример работы"
          onClick={() => setEditor("new")}
        >
          +
        </button>
      }
      titleRowEnd={
        <Link
          href="/work-examples/trash"
          className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          Корзина
        </Link>
      }
    >
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => {
          const photos = it.files.filter((f) => f.kind === "PHOTO");
          const cover = it.coverFileId || photos[0]?.id;
          return (
            <li key={it.id}>
              <button
                type="button"
                className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-left shadow-sm transition hover:border-[var(--sidebar-blue)]"
                onClick={() => setView(it)}
              >
                <div className="aspect-[4/3] bg-[var(--surface-subtle)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(it.id, cover)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                      нет фото
                    </div>
                  )}
                </div>
                <div className="space-y-1 px-3 py-2">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    {it.unassigned ? "не распределен" : it.orderNumber}
                  </p>
                  <p className="line-clamp-2 text-xs text-[var(--text-muted)]">
                    {it.cardTypes.map((t) => t.name).join(" · ") || "без типа"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {!items.length ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          Пока нет примеров. Нажмите «+».
        </p>
      ) : null}

      {editor !== null ? (
        <WorkExampleEditorModal
          item={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(next) => {
            upsert(next);
            if (editor === "new") setEditor(next);
          }}
        />
      ) : null}

      {view ? (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-3 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setView(null);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <header className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
              <div>
                <p className="font-semibold">
                  {workExampleDisplayTitle(view)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {view.cardTypes.map((t) => t.name).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--card-border)] px-2 py-1 text-sm"
                  title="Поделиться"
                  onClick={() => void openShare(view.id)}
                >
                  QR
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--card-border)] px-2 py-1 text-sm"
                  onClick={() => {
                    setEditor(view);
                    setView(null);
                  }}
                >
                  Изменить
                </button>
                {canDeleteWhole ? (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-sm text-red-600"
                    onClick={() => void removeWhole(view.id)}
                  >
                    Удалить
                  </button>
                ) : null}
                <button type="button" className="text-sm text-[var(--text-muted)]" onClick={() => setView(null)}>
                  Закрыть
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {view.files
                  .filter((f) => f.kind === "PHOTO")
                  .map((f, _, all) => (
                    <div key={f.id} className="relative">
                      <button
                        type="button"
                        className="overflow-hidden rounded-lg border border-[var(--card-border)]"
                        onClick={() =>
                          setLightbox({
                            images: all.map((x) => ({
                              id: x.id,
                              fileName: x.fileName,
                              url: fileUrl(view.id, x.id),
                            })),
                            index: all.findIndex((x) => x.id === f.id),
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fileUrl(view.id, f.id)} alt={f.fileName} className="h-28 w-28 object-cover" />
                      </button>
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded bg-black/55 px-1.5 text-[10px] text-white"
                        onClick={() => void removeFile(view.id, f.id)}
                      >
                        удалить
                      </button>
                    </div>
                  ))}
              </div>
              {view.files.some((f) => isWorkExampleViewableMesh(f.fileName)) ? (
                <WorkExampleMeshViewer
                  className="rounded-xl border border-[var(--card-border)]"
                  meshes={view.files
                    .filter((f) => isWorkExampleViewableMesh(f.fileName))
                    .map((f) => ({
                      url: fileUrl(view.id, f.id),
                      fileName: f.fileName,
                    }))}
                />
              ) : null}
              {view.files
                .filter((f) => isWorkExampleViewableHtml(f.fileName))
                .map((f) => (
                  <WorkExampleHtmlViewer
                    key={f.id}
                    className="rounded-xl border-[var(--card-border)]"
                    url={fileUrl(view.id, f.id)}
                    fileName={f.fileName}
                  />
                ))}
              <ul className="space-y-1">
                {view.files
                  .filter((f) => f.kind !== "PHOTO")
                  .map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <a
                        href={fileUrl(view.id, f.id)}
                        className="text-[var(--sidebar-blue)] hover:underline"
                        download
                      >
                        {f.fileName}
                      </a>
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => void removeFile(view.id, f.id)}
                      >
                        удалить
                      </button>
                    </li>
                  ))}
              </ul>
              {view.cloudUrl ? (
                <p>
                  Ссылка:{" "}
                  <a href={view.cloudUrl} className="text-[var(--sidebar-blue)]" target="_blank" rel="noreferrer">
                    {view.cloudUrl}
                  </a>{" "}
                  <button type="button" className="text-xs text-red-600" onClick={() => void removeLink(view)}>
                    удалить
                  </button>
                </p>
              ) : null}
              {view.cloudUrlDeleted ? (
                <p className="rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  {view.cloudUrlDeleted.caption}{" "}
                  <button
                    type="button"
                    className="text-[var(--sidebar-blue)]"
                    onClick={() => void restore({ kind: "link", exampleId: view.id })}
                  >
                    восстановить
                  </button>
                </p>
              ) : null}
              {view.deletedFiles.map((f) => (
                <p
                  key={f.id}
                  className="rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-muted)]"
                >
                  {f.caption}{" "}
                  <button
                    type="button"
                    className="text-[var(--sidebar-blue)]"
                    onClick={() =>
                      void restore({ kind: "file", exampleId: view.id, fileId: f.id })
                    }
                  >
                    восстановить
                  </button>
                </p>
              ))}
              {view.technicianNotes ? (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Техник</p>
                  <p className="whitespace-pre-wrap">{view.technicianNotes}</p>
                </div>
              ) : null}
              {view.doctorComments ? (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">Доктор</p>
                  <p className="whitespace-pre-wrap">{view.doctorComments}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {share ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShare(null);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-center">
            <p className="mb-3 text-sm font-semibold">Поделиться примером</p>
            {share.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={share.qr} alt="QR" className="mx-auto mb-3 h-48 w-48" />
            ) : null}
            <p className="mb-3 break-all text-xs text-[var(--text-muted)]">{share.url}</p>
            <button
              type="button"
              className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm text-white"
              onClick={() => void navigator.clipboard.writeText(share.url)}
            >
              Скопировать ссылку
            </button>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <ImageLightbox
          state={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
        />
      ) : null}
    </ModuleFrame>
  );
}
