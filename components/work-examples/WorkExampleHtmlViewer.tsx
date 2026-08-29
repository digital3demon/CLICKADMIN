"use client";

import { useEffect, useState } from "react";
import { WorkExampleMeshViewer } from "@/components/work-examples/WorkExampleMeshViewer";
import {
  extractExocadHtmlMeshes,
  type WorkExampleInlineMesh,
} from "@/lib/work-examples/exocad-html-extract";
import { workExampleHtmlSceneKind } from "@/lib/work-examples/html-scene-kind";

/** D3D-реэкспорт — свой standalone iframe. Exocad HTML — меши в D3D-свете, не плеер exocad. */
export function WorkExampleHtmlViewer({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
}) {
  const [mode, setMode] = useState<"loading" | "d3d" | "exocad" | "error">("loading");
  const [inline, setInline] = useState<WorkExampleInlineMesh[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    setInline([]);
    setErr(null);

    void (async () => {
      try {
        const r = await fetch(url, {
          credentials: "include",
          signal: AbortSignal.timeout(120_000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const html = await r.text();
        if (cancelled) return;
        const kind = workExampleHtmlSceneKind(html);
        if (kind === "d3d") {
          setMode("d3d");
          return;
        }
        if (kind === "exocad") {
          const meshes = extractExocadHtmlMeshes(html);
          if (!meshes.length) {
            throw new Error("в HTML нет мешей OpenCTM");
          }
          setInline(meshes);
          setMode("exocad");
          return;
        }
        throw new Error("не D3D и не exocad HTML");
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "не удалось открыть сцену");
        setMode("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const shell = `overflow-hidden rounded-2xl border border-white/10 bg-[#2a2a30] ${className ?? ""}`;

  if (mode === "d3d") {
    return (
      <div className={shell}>
        <iframe
          title={fileName}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="h-[min(70vh,560px)] min-h-[360px] w-full border-0"
          allow="fullscreen"
        />
      </div>
    );
  }

  if (mode === "exocad") {
    return <WorkExampleMeshViewer inlineMeshes={inline} className={className} />;
  }

  return (
    <div
      className={`${shell} flex h-[min(70vh,560px)] min-h-[360px] items-center justify-center px-4 text-center text-sm text-white/70`}
    >
      {mode === "loading"
        ? "Загрузка сцены…"
        : `Не удалось открыть «${fileName}»: ${err ?? "неизвестная HTML-сцена"}. Нужен реэкспорт HTML из D3Dviewer.`}
    </div>
  );
}
