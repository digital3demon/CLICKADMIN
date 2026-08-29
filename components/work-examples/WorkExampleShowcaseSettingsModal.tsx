"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WORK_EXAMPLE_SHOWCASE_NAME_MAX } from "@/lib/work-examples/constants";

export function WorkExampleShowcaseSettingsModal({ onClose }: { onClose: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [hasLogo, setHasLogo] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/work-examples/showcase", { credentials: "include" });
      const j = (await r.json()) as {
        displayName?: string;
        tenantName?: string | null;
        hasLogo?: boolean;
        error?: string;
      };
      if (!r.ok) {
        setErr(j.error || "Не удалось загрузить");
        return;
      }
      setDisplayName(j.displayName ?? "");
      setTenantName(j.tenantName ?? "");
      setHasLogo(j.hasLogo === true);
      if (j.hasLogo) setPreview(`/api/work-examples/showcase/logo?t=${Date.now()}`);
    })();
  }, []);

  useEffect(() => {
    if (!pendingLogo) return;
    const url = URL.createObjectURL(pendingLogo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/work-examples/showcase", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setErr(j.error || "Не удалось сохранить название");
        return;
      }
      if (removeLogo && !pendingLogo) {
        const d = await fetch("/api/work-examples/showcase/logo", {
          method: "DELETE",
          credentials: "include",
        });
        if (!d.ok) {
          setErr("Не удалось убрать логотип");
          return;
        }
      }
      if (pendingLogo) {
        const fd = new FormData();
        fd.set("file", pendingLogo);
        const u = await fetch("/api/work-examples/showcase/logo", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const uj = (await u.json().catch(() => ({}))) as { error?: string };
        if (!u.ok) {
          setErr(uj.error || "Не удалось загрузить логотип");
          return;
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <h2 className="text-base font-semibold">Название для витрины</h2>
          <button type="button" className="text-sm text-[var(--text-muted)]" onClick={onClose}>
            Закрыть
          </button>
        </header>
        <div className="space-y-3 px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">
            На витрине по QR, не имя тенанта
            {tenantName ? ` (сейчас в CRM: «${tenantName}»)` : ""}.
          </p>
          <label className="block text-sm">
            <span className="text-xs text-[var(--text-muted)]">Как называть лабораторию</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2"
              value={displayName}
              maxLength={WORK_EXAMPLE_SHOWCASE_NAME_MAX}
              placeholder={tenantName || "Название лаборатории"}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Логотип</p>
            <div className="mt-1 flex items-center gap-3">
              {preview && !removeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-[var(--card-border)] object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] text-[10px] text-[var(--text-muted)]">
                  нет
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Выбрать файл
                </button>
                {hasLogo || pendingLogo ? (
                  <button
                    type="button"
                    className="text-sm text-[var(--sidebar-blue)]"
                    onClick={() => {
                      setPendingLogo(null);
                      setRemoveLogo(true);
                      setPreview(null);
                    }}
                  >
                    Убрать
                  </button>
                ) : null}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setPendingLogo(f);
                setRemoveLogo(false);
              }}
            />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3">
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
        </footer>
      </div>
    </div>,
    document.body,
  );
}
