import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";

export type OrdersHistoryTab = "changes" | "corrections" | "prosthetics";

export type CorrectionHistorySource = "KAITEN" | "DEMO_KANBAN";

export type CorrectionHistoryRow = {
  id: string;
  kind: "correction" | "prosthetics";
  text: string;
  source: CorrectionHistorySource;
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

export function parseOrdersHistoryTab(
  raw: string | null | undefined,
): OrdersHistoryTab {
  if (raw === "corrections") return "corrections";
  if (raw === "prosthetics") return "prosthetics";
  return "changes";
}

export function ordersHistoryHref(opts?: {
  tab?: OrdersHistoryTab;
  q?: string | null;
}): string {
  const p = new URLSearchParams();
  if (opts?.tab === "corrections") p.set("tab", "corrections");
  if (opts?.tab === "prosthetics") p.set("tab", "prosthetics");
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/orders/history?${qs}` : "/orders/history";
}

export function formatRuDateTime(d: Date): string {
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      label: "Пришла",
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

export type CorrectionHistoryJsonRow = {
  id: string;
  text: string;
  source: CorrectionHistorySource;
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
