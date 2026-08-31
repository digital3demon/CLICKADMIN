/**
 * Хост D3D embed: /d3d-viewer/index.html?src=… (3d viever/embed/AGENTS.md).
 * HTML исходный. Браузер парсит Exocad/D3D. CLI на сервере не нужен.
 */

export const WORK_EXAMPLE_D3D_VIEWER_PATH = "/d3d-viewer/index.html";

export function workExampleD3dViewerHref(htmlUrl: string): string {
  const src = String(htmlUrl || "").trim();
  if (!src) return WORK_EXAMPLE_D3D_VIEWER_PATH;
  return `${WORK_EXAMPLE_D3D_VIEWER_PATH}?src=${encodeURIComponent(src)}`;
}
