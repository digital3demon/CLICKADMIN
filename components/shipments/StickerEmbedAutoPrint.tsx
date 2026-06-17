"use client";

import { useEffect } from "react";
import { CRM_PRINT_READY } from "@/lib/print-browser-session";

/** В embed-iframe: ждём отрисовку (React, шрифты, картинки) и вызываем print() изнутри фрейма. */
export function StickerEmbedAutoPrint() {
  useEffect(() => {
    let cancelled = false;

    const notifyReady = () => {
      try {
        window.parent.postMessage({ type: CRM_PRINT_READY }, window.location.origin);
      } catch {
        /* ignore */
      }
    };

    const runPrint = () => {
      if (cancelled) return;
      notifyReady();
      try {
        window.print();
      } catch {
        /* ignore */
      }
    };

    const waitAssets = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              const done = () => resolve();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
        ),
      );
    };

    void waitAssets().then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(runPrint);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
