/**
 * Вьювер витрины: только STL / PLY / OBJ (не zip, не 3mf, не «КАД» целиком).
 * Расширение из имени файла — URL API без суффикса.
 */

export type WorkExampleMeshKind = "stl" | "ply" | "obj";

const MESH_EXT = /\.(stl|ply|obj)$/iu;

export function workExampleMeshKind(fileName: string): WorkExampleMeshKind | null {
  const m = String(fileName || "").trim().match(MESH_EXT);
  if (!m?.[1]) return null;
  return m[1].toLowerCase() as WorkExampleMeshKind;
}

export function isWorkExampleViewableMesh(fileName: string): boolean {
  return workExampleMeshKind(fileName) != null;
}
