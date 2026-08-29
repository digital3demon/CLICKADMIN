"use client";

import { useEffect, useRef, useState } from "react";
import { injectD3dEmbedLiteIntoDocument } from "@/lib/work-examples/d3d-embed-lite";
import {
  D3D_SCENE_TEMPLATE_PATH,
  renderExocadHtmlAsD3dDocument,
} from "@/lib/work-examples/d3d-html-reexport";
import { workExampleHtmlSceneKind } from "@/lib/work-examples/html-scene-kind";

/** Хост по 3d viever/embed/AGENTS.md: iframe D3D HTML + lite-hide.css. */
export function WorkExampleHtmlViewer({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const blobRef = { current: null as string | null };
    setSrc(null);
    setErr(null);

    void (async () => {
      try {
        const r = await fetch(url, {
          credentials: "include",
          headers: { Range: "bytes=0-65535" },
          signal: AbortSignal.timeout(120_000),
        });
        if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`);
        const peek = await r.text();
        if (cancelled) return;
        const kind = workExampleHtmlSceneKind(peek);
        if (kind === "d3d") {
          setSrc(url);
          return;
        }
        const full =
          r.status === 206 || peek.length < 60_000
            ? await (
                await fetch(url, {
                  credentials: "include",
                  signal: AbortSignal.timeout(120_000),
                })
              ).text()
            : peek;
        if (cancelled) return;
        if (workExampleHtmlSceneKind(full) !== "exocad") {
          throw new Error("не D3D и не exocad HTML");
        }
        const tplRes = await fetch(D3D_SCENE_TEMPLATE_PATH, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!tplRes.ok) throw new Error("нет шаблона D3Dviewer");
        const doc = await renderExocadHtmlAsD3dDocument(full, fileName, await tplRes.text());
        if (cancelled) return;
        blobRef.current = URL.createObjectURL(
          new Blob([doc], { type: "text/html;charset=utf-8" }),
        );
        setSrc(blobRef.current);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "не удалось открыть сцену");
      }
    })();

    return () => {
      cancelled = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [url, fileName]);

  const injectLite = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try {
      injectD3dEmbedLiteIntoDocument(doc);
    } catch {
      /* cross-origin — lite уже в HTML при реэкспорте */
    }
  };

  const shell = `relative overflow-hidden rounded-lg border border-white/10 bg-[#0e1116] ${className ?? ""}`;
  const frameH = "h-[min(70vh,720px)] min-h-[360px]";

  if (src) {
    return (
      <div className={`${shell} ${frameH}`}>
        <iframe
          ref={iframeRef}
          className="d3d-viewer block h-full w-full border-0"
          title={fileName}
          src={src}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          onLoad={injectLite}
        />
      </div>
    );
  }

  return (
    <div
      className={`${shell} ${frameH} flex items-center justify-center px-4 text-center text-sm text-white/70`}
    >
      {err
        ? `Не удалось открыть «${fileName}»: ${err}`
        : "Загрузка сцены D3Dviewer…"}
    </div>
  );
}
