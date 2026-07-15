export const ORDER_LIST_ADMIN_MEMO_MAX_LEN = 100;

export type OrderListAdminMemoHistoryRow = {
  id: string;
  action: "SET" | "CLEAR";
  text: string | null;
  authorLabel: string | null;
  createdAt: string;
};

export function normalizeOrderListAdminMemoInput(
  raw: string | null | undefined,
): string | null {
  const t = raw == null ? "" : String(raw).trim();
  if (!t) return null;
  return t.slice(0, ORDER_LIST_ADMIN_MEMO_MAX_LEN);
}

export function formatOrderListAdminMemoHistoryLine(
  row: OrderListAdminMemoHistoryRow,
  formatWhen: (iso: string) => string,
): string {
  const who = row.authorLabel?.trim() || "—";
  const when = formatWhen(row.createdAt);
  if (row.action === "CLEAR") {
    return `${who} · ${when} — очистил`;
  }
  const text = row.text?.trim() || "—";
  return `${who} · ${when} — ${text}`;
}
