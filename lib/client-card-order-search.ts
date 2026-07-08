import { fieldsMatchListQuery } from "@/lib/prefix-search-match";
import { normalizeClientsSearchQuery } from "@/lib/clients-list-search";

export type ClientCardOrderItem = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  clinicId: string | null;
  clinicName: string | null;
  stageLabel: string;
  urgentLabel: string;
  createdAtLabel: string;
  shippedAtLabel: string;
};

export function clientCardOrderMatchesSearch(
  order: ClientCardOrderItem,
  query: string,
  variant: "clinic" | "doctor",
): boolean {
  const q = normalizeClientsSearchQuery(query);
  if (!q) return true;
  const fields =
    variant === "clinic"
      ? [
          order.orderNumber,
          order.doctorName,
          order.patientName,
          order.stageLabel,
          order.urgentLabel,
          order.createdAtLabel,
          order.shippedAtLabel,
        ]
      : [
          order.orderNumber,
          order.clinicName ?? "Частная практика",
          order.patientName,
          order.stageLabel,
          order.urgentLabel,
          order.createdAtLabel,
          order.shippedAtLabel,
        ];
  return fieldsMatchListQuery(fields, q);
}

export function filterClientCardOrders(
  orders: readonly ClientCardOrderItem[],
  query: string,
  variant: "clinic" | "doctor",
): ClientCardOrderItem[] {
  const q = normalizeClientsSearchQuery(query);
  if (!q) return [...orders];
  return orders.filter((o) => clientCardOrderMatchesSearch(o, q, variant));
}
