import type { ConstructionCategory, JawArch } from "@prisma/client";
import {
  clampPercent0to100,
  formatConstructionDescription,
  orderCompositionSubtotalAfterDiscountsRub,
} from "@/lib/format-order-construction";
import { formatMoscowDate, formatMoscowDateTime, formatMoscowTime } from "@/lib/moscow-datetime-format";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { ORDER_EXPORT_V2_HEADERS } from "@/lib/order-import-export";

export type OrderExportV2Construction = {
  sortOrder: number;
  category: ConstructionCategory;
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent?: number | null;
  constructionType: { name: string } | null;
  priceListItem: { code: string; name: string } | null;
  material: { name: string } | null;
  shade: string | null;
  teethFdi: unknown;
  bridgeFromFdi: string | null;
  bridgeToFdi: string | null;
  arch: JawArch | null;
};

export type OrderExportV2Input = {
  orderNumber: string;
  patientName: string | null;
  doctor: { fullName: string };
  clinic: { name: string; worksWithReconciliation: boolean | null } | null;
  clientOrderText: string | null;
  prostheticsText: string | null;
  registeredByLabel: string | null;
  workReceivedAt: Date | null;
  createdAt: Date;
  notes: string | null;
  hasCt: boolean;
  hasMri: boolean;
  hasPhoto: boolean;
  hasScans: boolean;
  additionalSourceNotes: string | null;
  dueDate: Date | null;
  appointmentDate: Date | null;
  dueToAdminsHasTime: boolean;
  adminShippedOtpr: boolean;
  payment: string | null;
  invoiceNumber: string | null;
  invoiceAttachmentCreatedAt: Date | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent: number | null;
  kaitenCardId: number | null;
  demoKanbanColumn: string | null;
  constructions: OrderExportV2Construction[];
  requisites: { legalFullName?: string | null; inn?: string | null } | null;
  revisions: Array<{ createdAt: Date; snapshot: unknown }>;
};

export function computeOrderSentAt(
  revisions: Array<{ createdAt: Date; snapshot: unknown }>,
): Date | null {
  let sentAt: Date | null = null;
  let prevShipped: boolean | null = null;
  for (const rev of revisions) {
    const snap = parseSnapshotV1(rev.snapshot);
    if (!snap) continue;
    const currentShipped = Boolean(snap.order.adminShippedOtpr);
    if (sentAt == null && prevShipped === false && currentShipped === true) {
      sentAt = rev.createdAt;
    }
    prevShipped = currentShipped;
  }
  return sentAt;
}

export function formatAdditionalSourceCell(order: {
  hasCt: boolean;
  hasMri: boolean;
  hasPhoto: boolean;
  hasScans: boolean;
  additionalSourceNotes: string | null;
}): string {
  const flags: string[] = [];
  if (order.hasCt) flags.push("КТ");
  if (order.hasMri) flags.push("МРТ");
  if (order.hasPhoto) flags.push("Фото");
  if (order.hasScans) flags.push("Сканы");
  const notes = (order.additionalSourceNotes ?? "").trim();
  const parts = [...flags];
  if (notes) parts.push(notes);
  return parts.join("; ");
}

export function formatRequisitesTemplateStyle(
  fields: { legalFullName?: string | null; inn?: string | null } | null | undefined,
): string {
  if (!fields) return "";
  const name = (fields.legalFullName ?? "").trim();
  const inn = (fields.inn ?? "").trim();
  if (!name && !inn) return "";
  const lines: string[] = [];
  if (name) lines.push(name);
  if (inn) lines.push(`ИНН ${inn}`);
  return lines.join("\n");
}

export function formatInvoiceCell(
  invoiceNumber: string | null | undefined,
  invoiceAttachmentCreatedAt: Date | null | undefined,
): string {
  const raw = (invoiceNumber ?? "").trim();
  if (!raw) return "";
  if (/(?:^|\s)от\s+\d/i.test(raw)) {
    if (/^сч[её]т\b/i.test(raw) || /^№/.test(raw)) return raw;
    return `Счёт ${raw}`;
  }
  const digits = raw.replace(/[^\d]/g, "") || raw;
  if (invoiceAttachmentCreatedAt) {
    return `Счёт ${digits} от ${formatMoscowDate(invoiceAttachmentCreatedAt)}`;
  }
  return `Счёт ${raw}`;
}

export function formatShippedCell(adminShippedOtpr: boolean, sentAt: Date | null): string {
  if (!adminShippedOtpr) return "Нет";
  if (sentAt) return `Да, ${formatMoscowDate(sentAt)}`;
  return "Да";
}

export function buildOrderExportInvoicedText(
  order: {
    isUrgent: boolean;
    urgentCoefficient: number | null;
    compositionDiscountPercent: number | null;
    doctor: { fullName: string };
  },
  constructions: OrderExportV2Construction[],
): string {
  const sorted = [...constructions].sort((a, b) => a.sortOrder - b.sortOrder);
  const lines: string[] = [];
  for (const c of sorted) {
    const qty = c.quantity > 0 ? c.quantity : 1;
    const price =
      c.unitPrice != null && Number.isFinite(c.unitPrice)
        ? Math.round(c.unitPrice)
        : 0;
    if (c.category === "PRICE_LIST" && c.priceListItem) {
      const code = c.priceListItem.code?.trim() ?? "";
      const name = c.priceListItem.name?.trim() ?? "";
      const label = code ? `${code} ${name}`.trim() : name;
      if (label) lines.push(`${label} *${price}*${qty}`);
    } else {
      const desc = formatConstructionDescription({
        category: c.category,
        constructionType: c.constructionType,
        priceListItem: c.priceListItem,
        material: c.material,
        shade: c.shade,
        teethFdi: c.teethFdi,
        bridgeFromFdi: c.bridgeFromFdi,
        bridgeToFdi: c.bridgeToFdi,
        arch: c.arch,
      });
      if (desc) lines.push(`${desc} *${price}*${qty}`);
    }
  }

  const mult = orderUrgentPriceMultiplier(order.isUrgent, order.urgentCoefficient);
  if (order.isUrgent && mult > 1) {
    const doctorShort = personNameSurnameInitials(order.doctor.fullName);
    lines.push(`Коэффициент ${doctorShort} х${mult}`);
  }

  const disc = clampPercent0to100(order.compositionDiscountPercent);
  if (disc > 0) {
    lines.push(`Скидка ${disc}%`);
  }

  return lines.join("\n");
}

export function formatOrderExportAmountRub(
  constructions: OrderExportV2Construction[],
  compositionDiscountPercent: number | null | undefined,
  isUrgent: boolean,
  urgentCoefficient: number | null,
): string {
  const lines = constructions.map((c) => ({
    quantity: c.quantity,
    unitPrice: c.unitPrice,
    lineDiscountPercent: c.lineDiscountPercent,
  }));
  const sub = orderCompositionSubtotalAfterDiscountsRub(
    lines,
    compositionDiscountPercent,
  );
  const mult = orderUrgentPriceMultiplier(isUrgent, urgentCoefficient);
  const total = Math.round(sub * mult);
  return `р.${total.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`;
}

export function mapOrderToExportV2Row(order: OrderExportV2Input): string[] {
  const receivedAt = order.workReceivedAt ?? order.createdAt;
  const sentAt = computeOrderSentAt(order.revisions);
  const clinicName = order.clinic?.name?.trim() || "Частное лицо";
  const appointmentTime =
    order.appointmentDate && order.dueToAdminsHasTime
      ? formatMoscowTime(order.appointmentDate)
      : "";
  const kanbanYes =
    order.kaitenCardId != null ||
    (order.demoKanbanColumn != null && String(order.demoKanbanColumn).trim() !== "");

  return [
    formatMoscowDateTime(receivedAt),
    formatMoscowDateTime(order.createdAt),
    order.registeredByLabel?.trim() ?? "",
    order.orderNumber,
    order.patientName?.trim() ?? "",
    order.doctor.fullName,
    clinicName,
    order.clientOrderText?.trim() ?? "",
    order.prostheticsText?.trim() ?? "",
    formatAdditionalSourceCell(order),
    order.notes?.trim() ?? "",
    order.dueDate ? formatMoscowDate(order.dueDate) : "",
    order.appointmentDate ? formatMoscowDate(order.appointmentDate) : "",
    appointmentTime,
    formatShippedCell(order.adminShippedOtpr, sentAt),
    formatRequisitesTemplateStyle(order.requisites),
    formatInvoiceCell(order.invoiceNumber, order.invoiceAttachmentCreatedAt),
    order.payment?.trim() ?? "",
    order.clinic?.worksWithReconciliation === true ? "Да" : "Нет",
    buildOrderExportInvoicedText(order, order.constructions),
    formatOrderExportAmountRub(
      order.constructions,
      order.compositionDiscountPercent,
      order.isUrgent,
      order.urgentCoefficient,
    ),
    kanbanYes ? "Да" : "Нет",
  ];
}

export function orderExportV2ColumnCount(): number {
  return ORDER_EXPORT_V2_HEADERS.length;
}

/** ARGB заливки шапки (строка 1) — из эталонного xlsx «таблица шаблон выгрузки». */
export const ORDER_EXPORT_V2_HEADER_FILLS = [
  "FFC3D69B", // A Зашла
  "FFC3D69B", // B Оформил
  "FF8CB3E4", // C Занес
  "FFB97135", // D Номер наряда
  "FFFAC090", // E Пациент
  "FFFAC090", // F Доктор
  "FFFAC090", // G Клиника
  "FFD99694", // H Заказ, расшифровка
  "FF93CDDD", // I Протетика
  "FF93CDDD", // J Что еще есть к работе
  "FF93CDDD", // K Комментарий от админов
  "FFB9CDE5", // L Дата лабораторная
  "FFC3D69B", // M Прием
  "FFC3D69B", // N Время
  "FFE6B9B8", // O Отгружено
  "FFFAC090", // P Реквизиты контрагента
  "FFD8D8D8", // Q Номер Счета
  "FFD99694", // R Оплата
  "FFD99694", // S Сверка
  "FFE6B9B8", // T Выставлено
  "FFD99694", // U Сумма
  "FFD99694", // V Карточка в кайтен/канбан
] as const;

/** Ширины колонок из эталонного xlsx. */
export const ORDER_EXPORT_V2_COLUMN_WIDTHS = [
  17.36, 27.18, 31.91, 9.0, 10.73, 15.73, 20.0, 36.63, 15.82, 14.27, 31.0, 15.18,
  10.36, 11.54, 15.27, 26.45, 12.0, 12.0, 20.0, 20.91, 26.91, 35.27,
] as const;

export const ORDER_EXPORT_V2_HEADER_ROW_HEIGHT = 29;
