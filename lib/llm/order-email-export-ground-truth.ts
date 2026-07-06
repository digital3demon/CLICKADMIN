import type { CompositionHint } from "./resolve-ai-composition-lines";
import { isScanLikeAttachment } from "@/lib/order-email-attachment-heuristics";

function normalizeFileName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Сопоставить файлы наряда с ID вложений писем (по имени файла). */
export function emailAttachmentIdsMatchingOrderFiles(
  orderAttachments: Array<{ fileName: string; mimeType: string }>,
  emailAttachments: Array<{ id: string; fileName: string; mimeType: string }>,
): string[] {
  const byName = new Map<string, string>();
  for (const e of emailAttachments) {
    const key = normalizeFileName(e.fileName);
    if (!byName.has(key)) byName.set(key, e.id);
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const oa of orderAttachments) {
    const id = byName.get(normalizeFileName(oa.fileName));
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Scan-like email attachment IDs, если на наряде hasScans, но имена не сопоставились. */
export function scanLikeEmailAttachmentIds(
  emailAttachments: Array<{ id: string; fileName: string; mimeType: string }>,
): string[] {
  return emailAttachments
    .filter((a) => isScanLikeAttachment(a.fileName, a.mimeType))
    .map((a) => a.id);
}

export function compositionHintsFromOrderConstructions(
  constructions: Array<{
    quantity: number;
    teethFdi: unknown;
    priceListItem: { code: string; name: string } | null;
  }>,
): CompositionHint[] {
  return constructions
    .filter((c) => c.priceListItem?.name)
    .map((c) => {
      const teethRaw = c.teethFdi;
      const teethFdi =
        Array.isArray(teethRaw) && teethRaw.every((t) => typeof t === "string")
          ? (teethRaw as string[])
          : null;
      return {
        nameHint: c.priceListItem!.name,
        quantity: c.quantity,
        teethFdi,
      };
    });
}
