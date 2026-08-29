import type { WorkExampleFileKindValue } from "@/lib/work-examples/constants";

/**
 * Классификация вложения по имени и MIME.
 * Границы расширения — точка + хвост, не `\b`: кириллица до/после имени не ломает матч.
 */
export function guessWorkExampleAttachKind(file: {
  name?: string;
  type?: string;
}): WorkExampleFileKindValue {
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(name)) {
    return "PHOTO";
  }
  if (/\.(stl|ply|obj|3mf|drc|dcm|html?|zip)$/i.test(name)) return "CAD";
  return "FILE";
}

export function isWorkExampleFormFile(x: FormDataEntryValue): x is File {
  if (typeof File !== "undefined" && x instanceof File) return true;
  return (
    typeof Blob !== "undefined" &&
    x instanceof Blob &&
    typeof x === "object" &&
    x != null &&
    "name" in x &&
    typeof (x as { name: unknown }).name === "string"
  );
}
