import { generateId, MAX_FILE_BYTES } from "./model";
import type { CardFile } from "./types";

export function isImageMime(mime: string): boolean {
  return (mime || "").toLowerCase().startsWith("image/");
}

/** Картинка для превью в чате/канбане: MIME image/* или типичное расширение (часто приходит application/octet-stream). */
export function isCardFileImage(f: { mime: string; name?: string }): boolean {
  if (isImageMime(f.mime)) return true;
  const n = (f.name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(n);
}

export function isPdfMime(mime: string, name?: string): boolean {
  const m = (mime || "").toLowerCase();
  if (m === "application/pdf" || m.includes("pdf")) return true;
  const n = (name || "").toLowerCase();
  return n.endsWith(".pdf");
}

/** Скачивание вложения. Картинки и PDF открывайте через просмотрщик в модалке карточки. */
export function openOrDownloadCardFile(f: CardFile): void {
  const mime = f.mime || "";
  if (isImageMime(mime) || isPdfMime(mime, f.name)) {
    window.open(f.dataUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const a = document.createElement("a");
  a.href = f.dataUrl;
  a.download = f.name || "file";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function readFileAsCardFile(file: File, userId: string): Promise<CardFile> {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(
      new Error(
        `Файл «${file.name}» больше ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} МБ`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) {
        reject(new Error("Не удалось прочитать файл"));
        return;
      }
      resolve({
        id: generateId("kf"),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        addedAt: new Date().toISOString(),
        addedByUserId: userId,
      });
    };
    reader.onerror = () => reject(new Error(`Не удалось прочитать «${file.name}»`));
    reader.readAsDataURL(file);
  });
}
