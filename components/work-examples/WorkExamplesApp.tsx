"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { WorkExampleEditorModal } from "@/components/work-examples/WorkExampleEditorModal";
import { WorkExampleShowcaseSettingsModal } from "@/components/work-examples/WorkExampleShowcaseSettingsModal";
import {
  workExampleDisplayTitle,
  type WorkExampleItem,
} from "@/components/work-examples/types";

function fileUrl(exampleId: string, fileId: string) {
  return `/api/work-examples/${encodeURIComponent(exampleId)}/files/${encodeURIComponent(fileId)}`;
}

export function WorkExamplesApp() {
  const [items, setItems] = useState<WorkExampleItem[]>([]);
  const [canDeleteWhole, setCanDeleteWhole] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editor, setEditor] = useState<WorkExampleItem | null | "new">(null);
  const [share, setShare] = useState<{ url: string; qr: string | null } | null>(null);
  const [showcaseSettings, setShowcaseSettings] = useState(false);

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

  const removeWhole = async (id: string) => {
    if (!window.confirm("Удалить весь пример работы в корзину на 5 дней?")) return;
    const r = await fetch(`/api/work-examples/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setEditor(null);
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
            onClick={() => setShowcaseSettings(true)}
          >
            Название для витрины
          </button>
          <Link
            href="/work-examples/trash"
            className="text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            Корзина
          </Link>
        </div>
      }
    >
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
      <ul className="flex flex-wrap gap-4">
        {items.map((it) => {
          const photos = it.files.filter((f) => f.kind === "PHOTO");
          const cover = it.coverFileId || photos[0]?.id;
          const types = it.cardTypes.map((t) => t.name).join(" · ");
          const orderLine = it.unassigned || !it.orderNumber ? "не распределен" : it.orderNumber;
          return (
            <li key={it.id} className="w-[min(100%,30rem)]">
              {/* 2× канбан (~240px) и пропорция листа A4 210×297 */}
              <div className="flex aspect-[210/297] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm transition hover:border-[var(--sidebar-blue)]">
                <button
                  type="button"
                  className="flex min-h-0 flex-1 flex-col px-4 pt-5 text-left"
                  onClick={() => setEditor(it)}
                >
                  <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-subtle)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileUrl(it.id, cover)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-muted)]">
                        нет фото
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex items-end justify-between gap-2 px-4 pb-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditor(it)}
                  >
                    <p className="truncate text-sm font-semibold text-[var(--text-strong)]">
                      {workExampleDisplayTitle(it)}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {orderLine}
                      {types ? ` · ${types}` : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-[var(--card-border)] px-1.5 py-0.5 text-[11px]"
                    onClick={() => void openShare(it.id)}
                  >
                    QR
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!items.length ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          Пока нет примеров. Нажмите «+».
        </p>
      ) : null}

      {showcaseSettings ? (
        <WorkExampleShowcaseSettingsModal onClose={() => setShowcaseSettings(false)} />
      ) : null}

      {editor !== null ? (
        <WorkExampleEditorModal
          item={editor === "new" ? null : editor}
          canDeleteWhole={canDeleteWhole}
          onClose={() => setEditor(null)}
          onSaved={(next) => {
            upsert(next);
          }}
          onShare={(id) => void openShare(id)}
          onDeleteWhole={(id) => void removeWhole(id)}
        />
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

    </ModuleFrame>
  );
}
