/**
 * Поиск наряда в модалке распознавания счетов (как «добавить письмо в заказ»).
 * Состав: позиции как в документообороте (название / кол-во / сумма);
 * пустой состав — первые строки clientOrderText (сумма 0).
 */
import type { ConstructionCategory, JawArch } from "@prisma/client";
import {
  formatConstructionDescription,
  lineNetAfterLineDiscountRub,
} from "@/lib/format-order-construction";
import type { DocumentCopyCompositionLine } from "@/lib/order-document-copy";

export type FinanceOfficeCompositionLine = DocumentCopyCompositionLine;

export type FinanceOfficeOrderSearchHit = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
  clinicName: string | null;
  label: string;
  compositionLines: string[];
  composition: FinanceOfficeCompositionLine[];
  alreadyHasInvoice: boolean;
  alreadyHasUpd: boolean;
  invoiceAttachmentId: string | null;
};

export function compositionItemsFromClientOrderText(
  raw: string | null | undefined,
): FinanceOfficeCompositionLine[] {
  return compositionLinesFromClientOrderText(raw).map((title) => ({
    title,
    quantity: 1,
    amountRub: 0,
  }));
}

export function financeOfficeCompositionFromConstructions(
  lines: Array<{
    category: ConstructionCategory;
    quantity: number;
    unitPrice: number | null;
    lineDiscountPercent: number | null;
    constructionTypeId: string | null;
    priceListItemId: string | null;
    materialId: string | null;
    shade: string | null;
    teethFdi: unknown;
    bridgeFromFdi: string | null;
    bridgeToFdi: string | null;
    arch: JawArch | null;
  }>,
  lookups: {
    typeById: Map<string, { name: string }>;
    materialById: Map<string, { name: string }>;
    priceById: Map<string, { code: string; name: string }>;
  },
): FinanceOfficeCompositionLine[] {
  return lines.map((line) => {
    const title = formatConstructionDescription({
      category: line.category,
      constructionType: line.constructionTypeId
        ? (lookups.typeById.get(line.constructionTypeId) ?? null)
        : null,
      priceListItem: line.priceListItemId
        ? (lookups.priceById.get(line.priceListItemId) ?? null)
        : null,
      material: line.materialId
        ? (lookups.materialById.get(line.materialId) ?? null)
        : null,
      shade: line.shade,
      teethFdi: line.teethFdi,
      bridgeFromFdi: line.bridgeFromFdi,
      bridgeToFdi: line.bridgeToFdi,
      arch: line.arch,
    });
    return {
      title,
      quantity:
        Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1,
      amountRub: lineNetAfterLineDiscountRub(
        line.quantity,
        line.unitPrice,
        line.lineDiscountPercent,
      ),
    };
  });
}

export function formatFinanceOfficeCompositionLine(opts: {
  quantity: number;
  name: string | null | undefined;
  shade: string | null | undefined;
}): string {
  const name = String(opts.name ?? "").trim() || "Позиция";
  const qty = Number.isFinite(opts.quantity) && opts.quantity > 1 ? `${opts.quantity}× ` : "";
  const shade = String(opts.shade ?? "").trim();
  return shade ? `${qty}${name}, ${shade}` : `${qty}${name}`;
}

export function compositionLinesFromClientOrderText(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((s) => (s.length > 96 ? `${s.slice(0, 95)}…` : s));
}

export function financeOfficeOrderHitLabel(hit: {
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
  clinicName: string | null;
}): string {
  const bits = [
    hit.orderNumber,
    (hit.patientName ?? "").trim() || "без пациента",
    (hit.doctorName ?? "").trim(),
    (hit.clinicName ?? "").trim(),
  ].filter(Boolean);
  return bits.join(" · ");
}
