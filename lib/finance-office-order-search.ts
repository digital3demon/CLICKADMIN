/**
 * Поиск наряда в модалке распознавания счетов (как «добавить письмо в заказ»).
 * Состав: имя позиции прайса или типа конструкции; пустой состав — первые строки clientOrderText.
 */

export type FinanceOfficeOrderSearchHit = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
  clinicName: string | null;
  label: string;
  compositionLines: string[];
  alreadyHasInvoice: boolean;
  alreadyHasUpd: boolean;
  invoiceAttachmentId: string | null;
};

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
