import { createHash } from "node:crypto";

/**
 * Стабильный отпечаток состава наряда.
 * PATCH с полным replace (deleteMany + create) иначе может вернуть плитки
 * из устаревшей вкладки или панели корректировок.
 */
export type ConstructionFingerprintInput = {
  category?: string;
  constructionTypeId?: string | null;
  priceListItemId?: string | null;
  materialId?: string | null;
  shade?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  lineDiscountPercent?: number | null;
  teethFdi?: unknown;
  bridgeFromFdi?: string | null;
  bridgeToFdi?: string | null;
  arch?: string | null;
  sortOrder?: number;
};

function normalizeTeethFdi(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"));
}

export function orderConstructionsFingerprint(
  rows: ConstructionFingerprintInput[],
): string {
  const canon = rows.map((r, i) => [
    r.sortOrder ?? i,
    r.category ?? "",
    r.constructionTypeId ?? "",
    r.priceListItemId ?? "",
    r.materialId ?? "",
    (r.shade ?? "").trim(),
    r.quantity ?? 1,
    r.unitPrice ?? null,
    r.lineDiscountPercent ?? 0,
    normalizeTeethFdi(r.teethFdi),
    (r.bridgeFromFdi ?? "").trim(),
    (r.bridgeToFdi ?? "").trim(),
    r.arch ?? "",
  ]);
  return createHash("sha256").update(JSON.stringify(canon)).digest("hex");
}
