"use client";

import { workExampleD3dViewerHref } from "@/lib/work-examples/d3d-viewer-href";

/**
 * По 3d viever/embed/AGENTS.md: iframe на статику embed/dist.
 * Исходный HTML (?src=) парсится в браузере. CLI на сервере не нужен.
 */
export function WorkExampleHtmlViewer({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
  /** @deprecated браузерный парсер, серверная конвертация не используется */
  convertUrl?: string;
}) {
  const src = workExampleD3dViewerHref(url);
  const shell = `relative overflow-hidden rounded-lg border border-white/10 bg-[#0e1116] ${className ?? ""}`;
  const frameH = "h-[min(70vh,720px)] min-h-[360px]";

  return (
    <div className={`${shell} ${frameH}`}>
      <iframe
        className="d3d-viewer block h-full w-full border-0"
        title={fileName}
        src={src}
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        allow="fullscreen"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
