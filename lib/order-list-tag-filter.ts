import type { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import {
  isLabWorkStatus,
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import {
  isOrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
} from "@/lib/order-status-labels";
import {
  ORDER_PAYMENT_EXPECTED,
  ORDER_PAYMENT_NOT_PAID,
} from "@/lib/order-clinic-client-fields";
import { kaitenTrackLaneListLabel } from "@/lib/kaiten-column-title";
import {
  WAIT_PAYMENT_PILL_LABEL,
  isWaitPaymentListTagLabel,
  waitPaymentListTagWhere,
} from "@/lib/wait-payment-list-tag";

/** Доска Kaiten в списке нарядов (`Order.kaitenTrackLane`). */
export type ListTagKaitenTrackLane =
  | "ORTHOPEDICS"
  | "ORTHODONTICS"
  | "TEST";

const KAITEN_TRACK_LANE_VALUES: readonly ListTagKaitenTrackLane[] = [
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
];

export function parseKaitenTrackLaneValue(
  raw: string | null | undefined,
): ListTagKaitenTrackLane | null {
  const u = String(raw || "").trim().toUpperCase();
  return KAITEN_TRACK_LANE_VALUES.includes(u as ListTagKaitenTrackLane)
    ? (u as ListTagKaitenTrackLane)
    : null;
}

/** Системные ключи в query `tag=` */
export const LIST_TAG_PROSTHETICS = "prosthetics";
/** Открытые заявки «???» по протетике (без отметки «Протетика заказана») */
export const LIST_TAG_PROSTHETICS_PENDING = "prosthetics-pending";
export const LIST_TAG_OTPR = "otpr";
/** Срочные наряды (`isUrgent`) */
export const LIST_TAG_URGENT = "urgent";
/** Срочно без множителя (`urgentCoefficient` = null) */
export const LIST_TAG_URGENT_NO_COEF = "urgent-nc";
/** Карточка Kaiten заблокирована (`kaitenBlocked`) */
export const LIST_TAG_KAITEN_BLOCKED = "kaiten-blocked";
/** Загружен файл счёта (`invoiceAttachmentId` задан) */
export const LIST_TAG_INVOICE = "invoice";
/** Отметка «Счёт распечатан» (`invoicePrinted`) */
export const LIST_TAG_INVOICE_PRINTED = "invoice-printed";
/** Загружен файл УПД (`updAttachmentId`) */
export const LIST_TAG_UPD = "upd";
/** Отметка «УПД распечатан» */
export const LIST_TAG_UPD_PRINTED = "upd-printed";
/** Жёлтый треугольник: непринятые корректировки «!!!» или расхождение суммы счёта с составом */
export const LIST_TAG_ORDER_ATTENTION = "order-attention";
/** Непустая пометка смен в колонке «ПА» (`Order.listAdminMemo`) */
export const LIST_TAG_ADMIN_MEMO = "admin-memo";
/** В чате Kaiten есть @упоминание тега лаборатории (кэш в Order.kaitenChatHasLabMention). */
export const LIST_TAG_KAITEN_LAB_MENTION = "kaiten-lab-mention";
export const LIST_TAG_PAYMENT_EXPECTED = "payment-expected";
export const LIST_TAG_PAYMENT_PARTIAL = "payment-partial";
export const LIST_TAG_PAYMENT_PAID = "payment-paid";
export const LIST_TAG_PAYMENT_RECON = "payment-reconciliation";
export const LIST_TAG_PAYMENT_RECON_PAID = "payment-reconciliation-paid";
export const LIST_TAG_FINANCE_CALCULATED = "finance-calculated";
export const LIST_TAG_FINANCE_NOT_CALCULATED = "finance-not-calculated";
/** Клиника работает по ЭДО (`Clinic.worksWithEdo`) */
export const LIST_TAG_EDO = "edo";
/** Клиника без ЭДО или наряд без клиники → пилюля «бумдоки» */
export const LIST_TAG_NO_EDO = "no-edo";
/** Клиника и по ЭДО, и по бумаге */
export const LIST_TAG_EDO_PAPER = "edo-paper";
/** Любая отметка «ждем оплату» (+ хвост до 20 символов). */
export const LIST_TAG_WAIT_PAYMENT = "wait-payment";

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
  /** Доска Kaiten: ортопедия / ортодонтия / тест (`Order.kaitenTrackLane`). */
  | { kind: "kaitenTrackLane"; lane: ListTagKaitenTrackLane }
  | { kind: "prosthetics" }
  | { kind: "prostheticsPending" }
  | { kind: "otpr" }
  | { kind: "urgent"; filter: "all" }
  | { kind: "urgent"; filter: "noCoef" }
  | { kind: "urgent"; filter: "coef"; coef: number }
  | { kind: "kaitenBlocked" }
  | { kind: "invoice" }
  | { kind: "invoicePrinted" }
  | { kind: "upd" }
  | { kind: "updPrinted" }
  | { kind: "orderAttention" }
  | { kind: "adminMemo" }
  | { kind: "kaitenLabMention" }
  | { kind: "paymentExpected" }
  | { kind: "paymentPartial" }
  | { kind: "paymentPaid" }
  | { kind: "paymentReconciliation" }
  | { kind: "paymentReconciliationPaid" }
  | { kind: "financeCalculated" }
  | { kind: "financeNotCalculated" }
  | { kind: "edo" }
  | { kind: "noEdo" }
  | { kind: "edoPaper" }
  | { kind: "waitPayment" }
  | { kind: "custom"; label: string };

const KAITEN_COLUMN_TAG_MAX_LEN = 500;

/** Ключ query `tag=` для фильтра по названию колонки Kaiten. */
export function listTagKaitenColumnTitle(title: string): string {
  const s = title.trim();
  return `k:${encodeURIComponent(s)}`;
}

/** Ключ query `tag=` для фильтра по доске (ортопедия / ортодонтия / тест). */
export function listTagKaitenTrackLane(lane: ListTagKaitenTrackLane): string {
  return `lane:${lane}`;
}

/** `tag=` для доски или `null`, если дорожка неизвестна. */
export function listTagKaitenTrackLaneOrNull(
  lane: string | null | undefined,
): string | null {
  const key = parseKaitenTrackLaneValue(lane);
  return key ? listTagKaitenTrackLane(key) : null;
}

/** Фильтр срочных с конкретным коэффициентом (как в карточке «×1.2»). */
export function listTagUrgentCoefficient(coef: number): string {
  if (!Number.isFinite(coef) || coef <= 0) return LIST_TAG_URGENT;
  return `urgent-cf~${coef}`;
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
  if (t.startsWith("urgent-cf~")) {
    const raw = t.slice("urgent-cf~".length).trim().replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { kind: "urgent", filter: "coef", coef: n };
  }
  if (t === LIST_TAG_URGENT_NO_COEF) return { kind: "urgent", filter: "noCoef" };
  if (t === LIST_TAG_URGENT) return { kind: "urgent", filter: "all" };
  if (t === LIST_TAG_KAITEN_BLOCKED) return { kind: "kaitenBlocked" };
  if (t === LIST_TAG_INVOICE) return { kind: "invoice" };
  if (t === LIST_TAG_INVOICE_PRINTED) return { kind: "invoicePrinted" };
  if (t === LIST_TAG_UPD) return { kind: "upd" };
  if (t === LIST_TAG_UPD_PRINTED) return { kind: "updPrinted" };
  if (t === LIST_TAG_ORDER_ATTENTION) return { kind: "orderAttention" };
  if (t === LIST_TAG_ADMIN_MEMO) return { kind: "adminMemo" };
  if (t === LIST_TAG_KAITEN_LAB_MENTION) return { kind: "kaitenLabMention" };
  if (t === LIST_TAG_PAYMENT_EXPECTED) return { kind: "paymentExpected" };
  if (t === LIST_TAG_PAYMENT_PARTIAL) return { kind: "paymentPartial" };
  if (t === LIST_TAG_PAYMENT_PAID) return { kind: "paymentPaid" };
  if (t === LIST_TAG_PAYMENT_RECON) return { kind: "paymentReconciliation" };
  if (t === LIST_TAG_PAYMENT_RECON_PAID) return { kind: "paymentReconciliationPaid" };
  if (t === LIST_TAG_FINANCE_CALCULATED) return { kind: "financeCalculated" };
  if (t === LIST_TAG_FINANCE_NOT_CALCULATED) return { kind: "financeNotCalculated" };
  if (t === LIST_TAG_EDO) return { kind: "edo" };
  if (t === LIST_TAG_NO_EDO) return { kind: "noEdo" };
  if (t === LIST_TAG_EDO_PAPER) return { kind: "edoPaper" };
  if (t === LIST_TAG_WAIT_PAYMENT) return { kind: "waitPayment" };

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

  if (t.startsWith("lane:")) {
    const lane = parseKaitenTrackLaneValue(t.slice(5));
    if (!lane) return null;
    return { kind: "kaitenTrackLane", lane };
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
    if (isWaitPaymentListTagLabel(label)) return { kind: "waitPayment" };
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
    case "kaitenTrackLane":
      return { kaitenTrackLane: parsed.lane };
    case "prosthetics":
      return { prostheticsOrdered: true };
    case "prostheticsPending":
      // Как история «Ожидает» и модалка «Заказать»: pending в legacy ИЛИ inbox.
      return {
        OR: [
          {
            prostheticsRequests: {
              some: { resolvedAt: null, rejectedAt: null },
            },
          },
          {
            chatInboxItems: {
              some: {
                type: "PROSTHETICS",
                resolvedAt: null,
                rejectedAt: null,
              },
            },
          },
        ],
      };
    case "otpr":
      return { adminShippedOtpr: true };
    case "urgent":
      switch (parsed.filter) {
        case "all":
          return { isUrgent: true };
        case "noCoef":
          return { isUrgent: true, urgentCoefficient: null };
        case "coef":
          return { isUrgent: true, urgentCoefficient: parsed.coef };
      }
    case "kaitenBlocked":
      return { kaitenBlocked: true };
    case "invoice":
      return { invoiceAttachmentId: { not: null } };
    case "invoicePrinted":
      return { invoicePrinted: true };
    case "upd":
      return { updAttachmentId: { not: null } };
    case "updPrinted":
      return { updPrinted: true };
    case "adminMemo":
      return {
        AND: [
          { listAdminMemo: { not: null } },
          { NOT: { listAdminMemo: "" } },
        ],
      };
    case "kaitenLabMention":
      return { kaitenChatHasLabMention: true };
    case "paymentExpected":
      return {
        OR: [
          { payment: ORDER_PAYMENT_NOT_PAID },
          { payment: ORDER_PAYMENT_EXPECTED },
        ],
      };
    case "paymentPartial":
      return { payment: "Частично оплачено" };
    case "paymentPaid":
      return { payment: "Оплачено" };
    case "paymentReconciliation":
      return { payment: { in: ["СВЕРКА", "Сверка-НЕ ОПЛАЧЕНО"] } };
    case "paymentReconciliationPaid":
      return { payment: "Сверка-ОПЛАЧЕНО" };
    case "financeCalculated":
      return { financeCalculated: true };
    case "financeNotCalculated":
      return { financeCalculated: false };
    case "edo":
      return {
        clinic: {
          worksWithEdo: true,
          usesPaperDocs: false,
          deletedAt: null,
        },
      };
    case "noEdo":
      return {
        OR: [
          { clinicId: null },
          { clinic: { worksWithEdo: false } },
        ],
      };
    case "edoPaper":
      return {
        clinic: {
          worksWithEdo: true,
          usesPaperDocs: true,
          deletedAt: null,
        },
      };
    case "waitPayment":
      return waitPaymentListTagWhere();
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
      return parsed.title;
    case "kaitenTrackLane":
      return kaitenTrackLaneListLabel(parsed.lane) ?? parsed.lane;
    case "prosthetics":
      return "Протетика заказана";
    case "prostheticsPending":
      return "Протетика: заявки из чата («???»)";
    case "otpr":
      return "Отправлено";
    case "urgent":
      switch (parsed.filter) {
        case "all":
          return "Срочно";
        case "noCoef":
          return "Срочно · без коэффициента";
        case "coef":
          return `Срочно · ×${parsed.coef}`;
        default:
          return "Срочно";
      }
    case "kaitenBlocked":
      return "Заблокировано";
    case "invoice":
      return "СЧЕТ";
    case "invoicePrinted":
      return "Счёт распечатан";
    case "upd":
      return "УПД";
    case "updPrinted":
      return "УПД распечатан";
    case "orderAttention":
      return "Внимание: корректировки или расхождение сумм";
    case "adminMemo":
      return "ПА";
    case "kaitenLabMention":
      return "ЧАТ: упоминание лаборатории (@…)";
    case "paymentExpected":
      return "Не оплачено";
    case "paymentPartial":
      return "Частично оплачено";
    case "paymentPaid":
      return "Оплачено";
    case "paymentReconciliation":
      return "Сверка";
    case "paymentReconciliationPaid":
      return "Сверка · оплачено";
    case "financeCalculated":
      return "Просчитано";
    case "financeNotCalculated":
      return "Не просчитано";
    case "edo":
      return "ЭДО";
    case "noEdo":
      return "бумдоки";
    case "edoPaper":
      return "ЭДО+бумдоки";
    case "waitPayment":
      return WAIT_PAYMENT_PILL_LABEL;
    case "custom":
      return parsed.label;
  }
}

/** Сравнение активного фильтра с ключом ссылки (учёт разного кодирования `k:` в URL). */
export function listTagParamsEqual(a: ParsedListTag, b: ParsedListTag): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "order" && b.kind === "order") return a.status === b.status;
  if (a.kind === "lab" && b.kind === "lab") return a.status === b.status;
  if (a.kind === "kaitenColumn" && b.kind === "kaitenColumn") {
    return a.title.trim() === b.title.trim();
  }
  if (a.kind === "kaitenTrackLane" && b.kind === "kaitenTrackLane") {
    return a.lane === b.lane;
  }
  if (a.kind === "urgent" && b.kind === "urgent") {
    if (a.filter !== b.filter) return false;
    if (a.filter === "coef" && b.filter === "coef") return a.coef === b.coef;
    return true;
  }
  if (a.kind === "custom" && b.kind === "custom") return a.label === b.label;
  return true;
}

export type RelatedOrdersListTagLink = { label: string; tag: string };

const PAYMENT_QUICK_FILTER_LINKS: RelatedOrdersListTagLink[] = [
  { label: "Не оплачено", tag: LIST_TAG_PAYMENT_EXPECTED },
  { label: "Частично оплачено", tag: LIST_TAG_PAYMENT_PARTIAL },
  { label: "Оплачено", tag: LIST_TAG_PAYMENT_PAID },
  { label: "Сверка", tag: LIST_TAG_PAYMENT_RECON },
  { label: "Сверка · оплачено", tag: LIST_TAG_PAYMENT_RECON_PAID },
];

const DEFAULT_URGENT_COEF_PRESETS = [1.2, 1.5] as const;

/**
 * Быстрые ссылки под активным фильтром по тегу: «другие состояния» того же типа
 * (статусы CRM, этапы лаборатории, оплата, срочность, колонки Kaiten и т.д.).
 */
export function relatedOrdersListTagQuickFilters(
  parsed: ParsedListTag,
  ctx: {
    /** Другие заголовки колонок Kaiten (кроме текущего), уже обрезанные. */
    kaitenColumnAlternates?: readonly string[];
    /** Уникальные коэффициенты срочности в нарядах тенанта (для подсказок фильтра). */
    urgentCoefficientsInDb?: readonly number[];
  } = {},
): RelatedOrdersListTagLink[] {
  switch (parsed.kind) {
    case "order":
      return ORDER_STATUS_ORDER.map((status) => ({
        label: ORDER_STATUS_LABELS[status],
        tag: listTagOrderStatus(status),
      }));
    case "lab":
      return LAB_WORK_STATUS_ORDER.map((status) => ({
        label: LAB_WORK_STATUS_LABELS[status],
        tag: listTagLabWork(status),
      }));
    case "kaitenColumn": {
      const titles = ctx.kaitenColumnAlternates ?? [];
      return titles.map((title) => ({
        label: title,
        tag: listTagKaitenColumnTitle(title),
      }));
    }
    case "kaitenTrackLane":
      return KAITEN_TRACK_LANE_VALUES.map((lane) => ({
        label: kaitenTrackLaneListLabel(lane) ?? lane,
        tag: listTagKaitenTrackLane(lane),
      }));
    case "urgent": {
      const fromDb = ctx.urgentCoefficientsInDb ?? [];
      const merged = Array.from(
        new Set([...DEFAULT_URGENT_COEF_PRESETS, ...fromDb]),
      ).sort((a, b) => a - b);
      const out: RelatedOrdersListTagLink[] = [
        { label: "Все срочные", tag: LIST_TAG_URGENT },
        { label: "Без коэффициента", tag: LIST_TAG_URGENT_NO_COEF },
      ];
      for (const c of merged) {
        out.push({ label: `×${c}`, tag: listTagUrgentCoefficient(c) });
      }
      return out;
    }
    case "paymentExpected":
    case "paymentPartial":
    case "paymentPaid":
    case "paymentReconciliation":
    case "paymentReconciliationPaid":
      return [...PAYMENT_QUICK_FILTER_LINKS];
    case "prosthetics":
      return [
        {
          label: humanListTagLabel({ kind: "prostheticsPending" }),
          tag: LIST_TAG_PROSTHETICS_PENDING,
        },
      ];
    case "prostheticsPending":
      return [
        {
          label: humanListTagLabel({ kind: "prosthetics" }),
          tag: LIST_TAG_PROSTHETICS,
        },
      ];
    case "invoice":
      return [
        {
          label: humanListTagLabel({ kind: "invoicePrinted" }),
          tag: LIST_TAG_INVOICE_PRINTED,
        },
      ];
    case "invoicePrinted":
      return [
        {
          label: humanListTagLabel({ kind: "invoice" }),
          tag: LIST_TAG_INVOICE,
        },
      ];
    case "upd":
      return [
        {
          label: humanListTagLabel({ kind: "updPrinted" }),
          tag: LIST_TAG_UPD_PRINTED,
        },
      ];
    case "updPrinted":
      return [
        {
          label: humanListTagLabel({ kind: "upd" }),
          tag: LIST_TAG_UPD,
        },
      ];
    case "financeCalculated":
      return [
        {
          label: humanListTagLabel({ kind: "financeNotCalculated" }),
          tag: LIST_TAG_FINANCE_NOT_CALCULATED,
        },
      ];
    case "financeNotCalculated":
      return [
        {
          label: humanListTagLabel({ kind: "financeCalculated" }),
          tag: LIST_TAG_FINANCE_CALCULATED,
        },
      ];
    case "edo":
      return [
        {
          label: humanListTagLabel({ kind: "noEdo" }),
          tag: LIST_TAG_NO_EDO,
        },
        {
          label: humanListTagLabel({ kind: "edoPaper" }),
          tag: LIST_TAG_EDO_PAPER,
        },
      ];
    case "noEdo":
      return [
        {
          label: humanListTagLabel({ kind: "edo" }),
          tag: LIST_TAG_EDO,
        },
        {
          label: humanListTagLabel({ kind: "edoPaper" }),
          tag: LIST_TAG_EDO_PAPER,
        },
      ];
    case "edoPaper":
      return [
        {
          label: humanListTagLabel({ kind: "edo" }),
          tag: LIST_TAG_EDO,
        },
        {
          label: humanListTagLabel({ kind: "noEdo" }),
          tag: LIST_TAG_NO_EDO,
        },
      ];
    default:
      return [];
  }
}
