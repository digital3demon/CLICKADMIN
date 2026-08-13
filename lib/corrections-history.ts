import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";
import { formatMoscowDateTime } from "@/lib/moscow-datetime-format";

export type OrdersHistoryTab =
  | "changes"
  | "corrections"
  | "prosthetics"
  | "tasks"
  | "pickups"
  | "stock";

export type CorrectionHistorySource = "KAITEN" | "DEMO_KANBAN";

export type CorrectionHistoryRow = {
  id: string;
  kind: "correction" | "prosthetics";
  text: string;
  source: CorrectionHistorySource;
  /** Автор сообщения в Kaiten/канбане (имя из комментария). */
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  arrivedAt: Date | null;
  resolvedByName: string | null;
  rejectedByName: string | null;
  arrivedByName: string | null;
  order: {
    id: string;
    orderNumber: string;
    patientName?: string | null;
    doctorName?: string | null;
  };
};

export const CORRECTION_SOURCE_LABEL: Record<CorrectionHistorySource, string> = {
  KAITEN: "Kaiten",
  DEMO_KANBAN: "Канбан",
};

export const CORRECTION_HISTORY_KIND_LABEL = {
  correction: "Корректировка",
  prosthetics: "Заказ протетики",
} as const;

/** Статус «Пришла» в истории (после степпера «Готово» = completedAt). */
export const PROSTHETICS_ARRIVED_STATUS_LABEL = "Пришла";

export function parseOrdersHistoryTab(
  raw: string | null | undefined,
): OrdersHistoryTab {
  if (raw === "corrections") return "corrections";
  if (raw === "prosthetics") return "prosthetics";
  if (raw === "tasks") return "tasks";
  if (raw === "pickups") return "pickups";
  if (raw === "stock") return "stock";
  return "changes";
}

export function ordersHistoryHref(opts?: {
  tab?: OrdersHistoryTab;
  q?: string | null;
}): string {
  const p = new URLSearchParams();
  if (opts?.tab === "corrections") p.set("tab", "corrections");
  if (opts?.tab === "prosthetics") p.set("tab", "prosthetics");
  if (opts?.tab === "tasks") p.set("tab", "tasks");
  if (opts?.tab === "pickups") p.set("tab", "pickups");
  if (opts?.tab === "stock") p.set("tab", "stock");
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/orders/history?${qs}` : "/orders/history";
}

export function formatRuDateTime(d: Date): string {
  return formatMoscowDateTime(d);
}

/** Статус решения: ожидает / принята / отклонена / пришла. */
export function formatCorrectionHistoryDecision(row: CorrectionHistoryRow): {
  status: "pending" | "accepted" | "rejected" | "arrived";
  label: string;
  detail: string | null;
} {
  if (row.rejectedAt) {
    const who = row.rejectedByName?.trim() || "—";
    return {
      status: "rejected",
      label: "Отклонена",
      detail: `${who}, ${formatRuDateTime(row.rejectedAt)}`,
    };
  }
  if (row.kind === "prosthetics" && row.arrivedAt) {
    const who = row.arrivedByName?.trim() || "—";
    return {
      status: "arrived",
      label: PROSTHETICS_ARRIVED_STATUS_LABEL,
      detail: `${who}, ${formatRuDateTime(row.arrivedAt)}`,
    };
  }
  if (row.resolvedAt) {
    const who = row.resolvedByName?.trim() || "—";
    return {
      status: "accepted",
      label: row.kind === "prosthetics" ? "В пути" : "Принята",
      detail: `${who}, ${formatRuDateTime(row.resolvedAt)}`,
    };
  }
  return { status: "pending", label: "Ожидает", detail: null };
}

/** Подпись автора заявки: «Имя, дата время» (как в «Кем и когда» для решения). */
export function formatCorrectionHistoryAuthorDetail(row: {
  authorLabel: string | null;
  createdAt: Date;
}): string {
  const who = row.authorLabel?.trim();
  const when = formatRuDateTime(row.createdAt);
  return who ? `${who}, ${when}` : when;
}

export type CorrectionHistoryStatusEvent = {
  status: "pending" | "accepted" | "rejected" | "arrived";
  label: string;
  at: Date;
  who: string | null;
};

/** Хронология статусов заявки (создание → решения) для раскрывающегося списка. */
export function buildCorrectionHistoryStatusTimeline(
  row: CorrectionHistoryRow,
): CorrectionHistoryStatusEvent[] {
  const events: CorrectionHistoryStatusEvent[] = [
    {
      status: "pending",
      label: "Ожидает",
      at: row.createdAt,
      who: null,
    },
  ];

  if (row.rejectedAt) {
    events.push({
      status: "rejected",
      label: "Отклонена",
      at: row.rejectedAt,
      who: row.rejectedByName,
    });
    return events;
  }

  if (row.resolvedAt) {
    events.push({
      status: "accepted",
      label: row.kind === "prosthetics" ? "В пути" : "Принята",
      at: row.resolvedAt,
      who: row.resolvedByName,
    });
  }

  if (row.kind === "prosthetics" && row.arrivedAt) {
    events.push({
      status: "arrived",
      label: PROSTHETICS_ARRIVED_STATUS_LABEL,
      at: row.arrivedAt,
      who: row.arrivedByName,
    });
  }

  return events;
}

export function formatCorrectionHistoryStatusEventDetail(
  event: CorrectionHistoryStatusEvent,
): string {
  const when = formatRuDateTime(event.at);
  const who = event.who?.trim();
  return who ? `${who}, ${when}` : when;
}

export type CorrectionHistoryJsonRow = {
  id: string;
  text: string;
  source: CorrectionHistorySource;
  authorLabel: string | null;
  createdAt: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
  resolvedByName: string | null;
  rejectedByName: string | null;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
};

export function correctionHistoryRowToJson(
  row: CorrectionHistoryRow,
): CorrectionHistoryJsonRow {
  return {
    id: row.id,
    text: row.text,
    source: row.source,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    resolvedByName: row.resolvedByName,
    rejectedByName: row.rejectedByName,
    orderId: row.order.id,
    orderNumber: row.order.orderNumber,
    patientName: row.order.patientName ?? null,
    doctorName: row.order.doctorName ?? null,
  };
}

export function correctionHistoryRowFromJson(
  row: CorrectionHistoryJsonRow,
): CorrectionHistoryRow {
  return {
    id: row.id,
    kind: "correction",
    text: row.text,
    source: row.source,
    authorLabel: row.authorLabel?.trim() || null,
    createdAt: new Date(row.createdAt),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt) : null,
    arrivedAt: null,
    resolvedByName: row.resolvedByName,
    rejectedByName: row.rejectedByName,
    arrivedByName: null,
    order: {
      id: row.orderId,
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctorName: row.doctorName,
    },
  };
}

export function mergeCorrectionHistoryRows(
  corrections: CorrectionHistoryRow[],
  prosthetics: CorrectionHistoryRow[],
  limit: number,
): CorrectionHistoryRow[] {
  const merged = [...corrections, ...prosthetics];
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged.slice(0, limit);
}
