/**
 * Состав витрины: только лабораторные OrderConstruction.
 * Без складских ourLines / inventoryItemId и без скидок.
 */
import type { WorkExampleCompositionLine } from "@/lib/work-examples/constants";

export type LabConstructionForSnapshot = {
  quantity?: number | null;
  unitPrice?: number | null;
  constructionType?: { name?: string | null } | null;
  priceListItem?: { name?: string | null } | null;
};

export function snapshotLabComposition(
  rows: readonly LabConstructionForSnapshot[],
): WorkExampleCompositionLine[] {
  const out: WorkExampleCompositionLine[] = [];
  for (const row of rows) {
    const name = (
      row.priceListItem?.name ||
      row.constructionType?.name ||
      "Работа"
    )
      .trim()
      .slice(0, 240);
    const quantity = Math.max(1, Math.round(Number(row.quantity) || 1));
    const unitPriceRub = Math.max(0, Number(row.unitPrice) || 0);
    out.push({
      name: name || "Работа",
      quantity,
      unitPriceRub,
      lineTotalRub: unitPriceRub * quantity,
    });
  }
  return out;
}

export function parseCompositionSnapshot(raw: unknown): WorkExampleCompositionLine[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkExampleCompositionLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name || "").trim().slice(0, 240) || "Работа";
    const quantity = Math.max(1, Math.round(Number(o.quantity) || 1));
    const unitPriceRub = Math.max(0, Number(o.unitPriceRub) || 0);
    out.push({
      name,
      quantity,
      unitPriceRub,
      lineTotalRub: unitPriceRub * quantity,
    });
  }
  return out;
}

export function parseCardTypesSnapshot(
  raw: unknown,
): Array<{ id: string; name: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id || "").trim();
    const name = String(o.name || "").trim().slice(0, 120);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  return out;
}
