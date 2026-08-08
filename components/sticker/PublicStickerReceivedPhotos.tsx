"use client";

import { useState } from "react";
import {
  ImageLightbox,
  type ImageLightboxItem,
  type ImageLightboxState,
} from "@/components/ui/ImageLightbox";

export type PublicStickerReceivedPhoto = {
  id: string;
  fileName: string;
  url: string;
};

/**
 * Блок «Приняли и Отправили» на публичной витрине QR-этикетки.
 * Тап/клик — полноэкранный просмотр (ImageLightbox).
 */
export function PublicStickerReceivedPhotos({
  photos,
}: {
  photos: PublicStickerReceivedPhoto[];
}) {
  const [lightbox, setLightbox] = useState<ImageLightboxState | null>(null);

  if (!photos.length) return null;

  const items: ImageLightboxItem[] = photos.map((p) => ({
    id: p.id,
    fileName: p.fileName,
    url: p.url,
  }));

  return (
    <section className="mt-6 border-t border-zinc-100 pt-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            Приняли и Отправили
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Нажмите фото, чтобы открыть крупно
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
          {photos.length}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {photos.map((p, index) => (
          <li key={p.id}>
            <button
              type="button"
              className="group relative block w-full overflow-hidden rounded-xl bg-zinc-100 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/80 transition hover:ring-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              onClick={() => setLightbox({ images: items, index })}
              aria-label={`Открыть ${p.fileName}`}
            >
              <span className="relative block aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.fileName}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] group-active:scale-[0.99]"
                />
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80"
                  aria-hidden
                />
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 truncate text-left text-[10px] font-medium text-white/95 drop-shadow-sm">
                  {p.fileName}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {lightbox ? (
        <ImageLightbox
          state={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) =>
            setLightbox((prev) => (prev ? { ...prev, index } : prev))
          }
        />
      ) : null}
    </section>
  );
}
