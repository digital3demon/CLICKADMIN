import type { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import {
  isLabWorkStatus,
  LAB_WORK_STATUS_LABELS,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import {
  isOrderStatus,
  ORDER_STATUS_LABELS,
} from "@/lib/order-status-labels";

/** Системные ключи в query `tag=` */
export const LIST_TAG_PROSTHETICS = "prosthetics";
/** Открытые заявки «???» по протетике (без отметки «Протетика заказана») */
export const LIST_TAG_PROSTHETICS_PENDING = "prosthetics-pending";
export const LIST_TAG_OTPR = "otpr";
/** Срочные наряды (`isUrgent`) */
export const LIST_TAG_URGENT = "urgent";
/** Карточка Kaiten заблокирована (`kaitenBlocked`) */
export const LIST_TAG_KAITEN_BLOCKED = "kaiten-blocked";
/** Загружен файл счёта (`invoiceAttachmentId` задан) */
export const LIST_TAG_INVOICE = "invoice";
/** Отметка «Счёт распечатан» (`invoicePrinted`) */
export const LIST_TAG_INVOICE_PRINTED = "invoice-printed";
/** Жёлтый треугольник: непринятые корректировки «!!!» или расхождение суммы счёта с составом */
export const LIST_TAG_ORDER_ATTENTION = "order-attention";

/** @deprecated Фильтр по статусу заказа CRM отключён в UI; ключ оставлен для старых ссылок. */
export function listTagOrderStatus(status: OrderStatus): string {
  return `s:${status}`;
}

export function listTagLabWork(status: LabWorkStatus): string {
  return `l:${status}`;
}

export function listTagCustomLabel(label: string): string {
  return `c:${label.trim()}`;
}

const CUSTOM_LABEL_MAX = 48;

/** Разрешённые символы в пользовательском теге (без «:», чтобы не путать с префиксами). */
export function isValidCustomListTagLabel(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 1 || s.length > CUSTOM_LABEL_MAX) return false;
  if (s.includes(":") || s.includes("\n") || s.includes("\r")) return false;
  return /^[\p{L}\p{N}\s._\-]+$/u.test(s);
}

export type ParsedListTag =
  | { kind: "order"; status: OrderStatus }
  | { kind: "lab"; status: LabWorkStatus }
  /** Колонка доски Kaiten (точное совпадение `Order.kaitenColumnTitle`). */
  | { kind: "kaitenColumn"; title: string }
  | { kind: "prosthetics" }
  | { kind: "prostheticsPending" }
  | { kind: "otpr" }
  | { kind: "urgent" }
  | { kind: "kaitenBlocked" }
  | { kind: "invoice" }
  | { kind: "invoicePrinted" }
  | { kind: "orderAttention" }
  | { kind: "custom"; label: string };

const KAITEN_COLUMN_TAG_MAX_LEN = 500;

/** Ключ query `tag=` для фильтра по названию колонки Kaiten. */
export function listTagKaitenColumnTitle(title: string): string {
  const s = title.trim();
  return `k:${encodeURIComponent(s)}`;
}

/**
 * Значение query-параметра `tag` (уже декодированное приложением один раз).
 */
export function parseListTagParam(decodedTag: string | null | undefined): ParsedListTag | null {
  if (decodedTag == null) return null;
  const t = decodedTag.trim();
  if (!t) return null;

  if (t === LIST_TAG_PROSTHETICS) return { kind: "prosthetics" };
  if (t === LIST_TAG_PROSTHETICS_PENDING) return { kind: "prostheticsPending" };
  if (t === LIST_TAG_OTPR) return { kind: "otpr" };
  if (t === LIST_TAG_URGENT) return { kind: "urgent" };
  if (t === LIST_TAG_KAITEN_BLOCKED) return { kind: "kaitenBlocked" };
  if (t === LIST_TAG_INVOICE) return { kind: "invoice" };
  if (t === LIST_TAG_INVOICE_PRINTED) return { kind: "invoicePrinted" };
  if (t === LIST_TAG_ORDER_ATTENTION) return { kind: "orderAttention" };

  if (t.startsWith("k:")) {
    try {
      const decoded = decodeURIComponent(t.slice(2));
      const title = decoded.trim();
      if (!title || title.length > KAITEN_COLUMN_TAG_MAX_LEN) return null;
      return { kind: "kaitenColumn", title };
    } catch {
      return null;
    }
  }

  if (t.startsWith("s:")) {
    const v = t.slice(2);
    if (isOrderStatus(v)) return { kind: "order", status: v };
    return null;
  }
  if (t.startsWith("l:")) {
    const v = t.slice(2);
    if (isLabWorkStatus(v)) return { kind: "lab", status: v };
    return null;
  }
  if (t.startsWith("c:")) {
    const label = t.slice(2).trim();
    if (!isValidCustomListTagLabel(label)) return null;
    return { kind: "custom", label: label.trim() };
  }
  return null;
}

export type ParsedListTagForSql = Exclude<ParsedListTag, { kind: "orderAttention" }>;

/** Условие «кандидаты» для фильтра треугольника; точное совпадение — в `fetchOrdersListPage`. */
export function orderAttentionListSupersetWhere(): Prisma.OrderWhereInput {
  return {
    OR: [
      { chatCorrections: { some: { resolvedAt: null } } },
      { invoiceParsedTotalRub: { not: null } },
    ],
  };
}

export function listTagWhere(parsed: ParsedListTagForSql): Prisma.OrderWhereInput {
  switch (parsed.kind) {
    case "order":
      return { status: parsed.status };
    case "lab":
      return { labWorkStatus: parsed.status };
    case "kaitenColumn":
      return { kaitenColumnTitle: parsed.title };
    case "prosthetics":
      return { prostheticsOrdered: true };
    case "prostheticsPending":
      return {
        prostheticsOrdered: false,
        prostheticsRequests: {
          some: { resolvedAt: null, rejectedAt: null },
        },
      };
    case "otpr":
      return { adminShippedOtpr: true };
    case "urgent":
      return { isUrgent: true };
    case "kaitenBlocked":
      return { kaitenBlocked: true };
    case "invoice":
      return { invoiceAttachmentId: { not: null } };
    case "invoicePrinted":
      return { invoicePrinted: true };
    case "custom":
      return {
        listCustomTags: { some: { label: parsed.label } },
      };
    default:
      return {};
  }
}

export function humanListTagLabel(parsed: ParsedListTag): string {
  switch (parsed.kind) {
    case "order":
      return ORDER_STATUS_LABELS[parsed.status];
    case "lab":
      return LAB_WORK_STATUS_LABELS[parsed.status];
    case "kaitenColumn":
      return `Кайтен: ${parsed.title}`;
    case "prosthetics":
      return "Протетика заказана";
    case "prostheticsPending":
      return "Протетика: заявки из чата («???»)";
    case "otpr":
      return "Отправлено";
    case "urgent":
      return "Срочно";
    case "kaitenBlocked":
      return "Заблокировано (Kaiten)";
    case "invoice":
      return "СЧЕТ";
    case "invoicePrinted":
      return "Счёт распечатан";
    case "orderAttention":
      return "Внимание: корректировки или расхождение сумм";
    case "custom":
      return parsed.label;
  }
}
