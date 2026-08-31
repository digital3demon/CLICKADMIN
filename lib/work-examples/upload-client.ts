import { WORK_EXAMPLE_MAX_FILE_BYTES } from "@/lib/work-examples/constants";
import { formatCrmUploadMaxShortRu } from "@/lib/crm-upload-limits";

export function workExampleUploadTimeoutMs(bytes: number): number {
  const n = Math.max(0, Number(bytes) || 0);
  return Math.min(300_000, Math.max(90_000, 30_000 + Math.ceil(n / 200_000) * 1000));
}

export function workExampleFileTooLargeMessage(fileName: string): string {
  const name = String(fileName || "файл").trim() || "файл";
  return `Файл «${name}» больше ${formatCrmUploadMaxShortRu()}`;
}

export function formatWorkExampleUploadHttpError(
  status: number,
  data: Record<string, unknown>,
  rawText: string,
  fileName?: string,
): string {
  const prefix = fileName?.trim() ? `«${fileName.trim()}»: ` : "";
  const errStr =
    typeof data.error === "string" && data.error.trim() ? data.error.trim() : "";
  if (errStr) return `${prefix}${errStr}`;
  if (status === 413) {
    return `${prefix}файл слишком большой для сервера (лимит ${formatCrmUploadMaxShortRu()})`;
  }
  const snippet = String(rawText || "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (/^<!DOCTYPE html/i.test(snippet) || /^<html/i.test(snippet)) {
    return `${prefix}сбой сервера при загрузке (HTML ${status})`;
  }
  if (snippet) return `${prefix}ошибка загрузки (${status}): ${snippet}`;
  return `${prefix}не удалось загрузить файл (${status || "?"})`;
}

export function isWorkExampleFileOverLimit(size: number): boolean {
  return size > WORK_EXAMPLE_MAX_FILE_BYTES;
}
