"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ImageLightboxItem = {
  id: string;
  fileName: string;
  url: string;
};

export type ImageLightboxState = {
  images: ImageLightboxItem[];
  index: number;
};

/** In-app просмотр картинок (как вложения наряда / Kaiten), без target=_blank. */
export function ImageLightbox({
  state,
  onClose,
  onIndexChange,
  showFileName = true,
}: {
  state: ImageLightboxState;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  /** На публичной витрине имя файла не показываем. */
  showFileName?: boolean;
}) {
  const current = state.images[state.index];
  const count = state.images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (count <= 1 || !onIndexChange) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange((state.index - 1 + count) % count);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange((state.index + 1) % count);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose, onIndexChange, state.index]);

  if (!current || typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
          {showFileName ? (
            <p
              className="min-w-0 truncate text-xs font-medium sm:text-sm"
              title={current.fileName}
            >
              {current.fileName}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {count > 1 ? (
              <span className="tabular-nums text-[11px] text-white/60">
                {state.index + 1}/{count}
              </span>
            ) : null}
            <button
              type="button"
              className="rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20 sm:text-xs"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </header>
        <div className="relative flex min-h-[12rem] items-center justify-center p-2 sm:min-h-[16rem] sm:p-4">
          {count > 1 && onIndexChange ? (
            <>
              <button
                type="button"
                className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70 sm:left-2"
                aria-label="Предыдущее"
                onClick={() =>
                  onIndexChange((state.index - 1 + count) % count)
                }
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70 sm:right-2"
                aria-label="Следующее"
                onClick={() => onIndexChange((state.index + 1) % count)}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={showFileName ? current.fileName : "Фото"}
            className="max-h-[min(70vh,620px)] max-w-full rounded-md object-contain"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
