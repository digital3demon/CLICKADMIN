/**
 * Вьювер витрины: STL / PLY / OBJ и HTML.
 * HTML сцены — iframe /d3d-viewer?src=… (браузерный парсер, embed/AGENTS.md).
 * Расширение из имени файла — URL API без суффикса.
 */

export type WorkExampleMeshKind = "stl" | "ply" | "obj";

const MESH_EXT = /\.(stl|ply|obj)$/iu;
const HTML_EXT = /\.html?$/iu;

export function workExampleMeshKind(fileName: string): WorkExampleMeshKind | null {
  const m = String(fileName || "").trim().match(MESH_EXT);
  if (!m?.[1]) return null;
  return m[1].toLowerCase() as WorkExampleMeshKind;
}

export function isWorkExampleViewableMesh(fileName: string): boolean {
  return workExampleMeshKind(fileName) != null;
}

export function isWorkExampleViewableHtml(fileName: string): boolean {
  return HTML_EXT.test(String(fileName || "").trim());
}

/** MIME для отдачи файла: HTML иначе nosniff не откроет сцену во iframe. */
export function workExampleFileContentType(
  fileName: string,
  storedMime: string | null | undefined,
): string {
  if (isWorkExampleViewableHtml(fileName)) return "text/html; charset=utf-8";
  const stored = String(storedMime || "").trim();
  if (stored && stored !== "application/octet-stream") return stored;
  const kind = workExampleMeshKind(fileName);
  if (kind === "stl") return "model/stl";
  if (kind === "ply") return "application/x-ply";
  if (kind === "obj") return "model/obj";
  return stored || "application/octet-stream";
}
