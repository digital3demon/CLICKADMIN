"use client";

/** HTML сцены из 3d viever / exocad: крутится внутри своего WebGL, как в десктопном вьювере. */
export function WorkExampleHtmlViewer({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#2a2a30] ${className ?? ""}`}
    >
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
