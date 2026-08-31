"use client";

import { useEffect, useRef, useState } from "react";
import { injectD3dEmbedLiteIntoDocument } from "@/lib/work-examples/d3d-embed-lite";
import { D3D_HTML_EXPORT_TIMEOUT_MS } from "@/lib/work-examples/constants";
import { workExampleHtmlSceneKind } from "@/lib/work-examples/html-scene-kind";

/**
 * Хост по 3d viever/embed/AGENTS.md: детект → CLI convert на сервере → iframe только D3D HTML.
 * Браузер Exocad не парсит.
 */
export function WorkExampleHtmlViewer({
  url,
  convertUrl,
  fileName,
  className,
}: {
  url: string;
  convertUrl?: string;
  fileName: string;
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState("Загрузка сцены D3Dviewer…");

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setErr(null);
    setPhase("Загрузка сцены D3Dviewer…");

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
        if (kind !== "exocad") {
          throw new Error("файл не D3D и не Exocad HTML");
        }
        if (!convertUrl) {
          throw new Error("Exocad HTML нужно сконвертировать на сервере");
        }
        setPhase("Конвертация Exocad → D3D…");
        const conv = await fetch(convertUrl, {
          method: "POST",
          credentials: "include",
          signal: AbortSignal.timeout(D3D_HTML_EXPORT_TIMEOUT_MS),
        });
        const body = (await conv.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
        };
        if (cancelled) return;
        if (!conv.ok) {
          throw new Error(body.error || `конвертация HTTP ${conv.status}`);
        }
        const next = body.url || url;
        setSrc(`${next}${next.includes("?") ? "&" : "?"}v=${Date.now()}`);
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof Error ? e.name : "";
        const message =
          name === "TimeoutError" || name === "AbortError"
            ? "конвертация заняла слишком много времени"
            : e instanceof Error
              ? e.message
              : "не удалось открыть сцену";
        setErr(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, convertUrl, fileName]);

  const injectLite = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try {
      injectD3dEmbedLiteIntoDocument(doc);
    } catch {
      /* cross-origin — lite уже в HTML после convert */
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
      {err ? `Не удалось открыть «${fileName}»: ${err}` : phase}
    </div>
  );
}
