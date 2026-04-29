import type { DetailLine } from "@/components/orders/new-order-form/detail-lines";
import { parseLineQuantity, parseUnitPriceRub } from "@/lib/order-construction-input";

export type BridgeLineInput = {
  bridgeFromFdi: string;
  bridgeToFdi: string;
  constructionTypeId?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  materialId?: string | null;
  shade?: string | null;
};

/** JSON для POST/PATCH заказа: позиции вкладки «Состав» (новый наряд) + мосты */
export function detailLinesAndBridgesToConstructionsJson(
  detailLines: DetailLine[],
  bridgeLines: BridgeLineInput[],
): unknown[] {
  const out: unknown[] = [];
  for (const line of detailLines) {
    const qty = parseLineQuantity(line.quantity ?? 1);
    const price = parseUnitPriceRub(line.unitPrice);
    const materialId =
      line.materialId != null && String(line.materialId).trim()
        ? String(line.materialId).trim()
        : null;
    const shade =
      line.shade != null && String(line.shade).trim()
        ? String(line.shade).trim()
        : null;
    if (line.kind === "priceList") {
      const row: Record<string, unknown> = {
        priceListItemId: line.priceListItemId,
        quantity: qty,
        unitPrice: price,
      };
      const teeth = (line.teethFdi ?? []).map(String).filter(Boolean);
      if (teeth.length > 0) {
        row.teethFdi = teeth;
      }
      if (line.jawArch != null) {
        row.arch = line.jawArch;
      }
      out.push(row);
      continue;
    }
    if (line.kind === "teeth") {
      out.push({
        constructionTypeId: line.constructionTypeId,
        teethFdi: line.teethFdi,
        quantity: qty,
        unitPrice: price,
        materialId,
        shade,
      });
    } else {
      out.push({
        constructionTypeId: line.constructionTypeId,
        arch: line.arch,
        quantity: qty,
        unitPrice: price,
        materialId,
        shade,
      });
    }
  }
  for (const b of bridgeLines) {
    const from = String(b.bridgeFromFdi).trim();
    const to = String(b.bridgeToFdi).trim();
    if (!from || !to) continue;
    out.push({
      bridgeFromFdi: from,
      bridgeToFdi: to,
      constructionTypeId: b.constructionTypeId?.trim() || null,
      quantity: parseLineQuantity(b.quantity ?? 1),
      unitPrice: parseUnitPriceRub(b.unitPrice),
      materialId:
        b.materialId != null && String(b.materialId).trim()
          ? String(b.materialId).trim()
          : null,
      shade:
        b.shade != null && String(b.shade).trim()
          ? String(b.shade).trim()
          : null,
    });
  }
  return out;
}
