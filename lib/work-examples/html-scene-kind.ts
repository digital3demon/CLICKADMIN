/**
 * HTML сцены витрины: D3D-реэкспорт vs exocad webview.
 * Маркеры ищем как подстроки — `\b` не видит кириллицу вокруг них.
 */

export type WorkExampleHtmlSceneKind = "d3d" | "exocad" | "unknown";

const D3D_MARKERS = [
  'name="d3d-scene" content="1"',
  'name="generator" content="D3Dviewer"',
  'id="d3d-scene-payload"',
  "application/d3d+gzip",
] as const;

const EXOCAD_MARKERS = [
  "exocad webview",
  "exocad GmbH",
  "DentalWebGL",
] as const;

export function workExampleHtmlSceneKind(html: string): WorkExampleHtmlSceneKind {
  const text = String(html || "");
  if (D3D_MARKERS.some((m) => text.includes(m))) return "d3d";
  if (EXOCAD_MARKERS.some((m) => text.includes(m))) return "exocad";
  return "unknown";
}
