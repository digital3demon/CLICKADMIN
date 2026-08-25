/**
 * Пилюли заказов и финотдела: inbox и legacy — одна заявка, если один комментарий
 * (тот же kid или тот же текст и createdAt в окне близнеца).
 * Тот же текст спустя несколько секунд — отдельная заявка.
 */
import { areChatRequestCreatedTwins } from "@/lib/order-chat-request-twin";

export type ChatPendingTwinSoft = {
  orderId: string;
  kaitenCommentId: number | null;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  text?: string | null;
  createdAt?: Date | null;
};

function isOpen(row: ChatPendingTwinSoft): boolean {
  return row.resolvedAt == null && row.rejectedAt == null;
}

export function orderIdsPendingAfterTwinMerge(
  inbox: ChatPendingTwinSoft[],
  legacy: ChatPendingTwinSoft[],
  textKey: (raw: string) => string,
): Set<string> {
  const byOrder = new Map<string, ChatPendingTwinSoft[]>();
  for (const row of [...inbox, ...legacy]) {
    const oid = row.orderId.trim();
    if (!oid) continue;
    const list = byOrder.get(oid);
    if (list) list.push(row);
    else byOrder.set(oid, [row]);
  }

  const pending = new Set<string>();
  for (const [orderId, rows] of byOrder) {
    const closedKids = new Set<number>();
    for (const row of rows) {
      if (!isOpen(row) && row.kaitenCommentId != null) {
        closedKids.add(row.kaitenCommentId);
      }
    }

    const remaining = rows.filter(
      (row) =>
        row.kaitenCommentId == null || !closedKids.has(row.kaitenCommentId),
    );

    const closed = remaining.filter((r) => !isOpen(r));
    for (const row of remaining) {
      if (!isOpen(row)) continue;
      const key = textKey(String(row.text || ""));
      const closedTwin =
        key &&
        closed.some(
          (c) =>
            textKey(String(c.text || "")) === key &&
            areChatRequestCreatedTwins(c.createdAt, row.createdAt),
        );
      if (closedTwin) continue;
      pending.add(orderId);
      break;
    }
  }
  return pending;
}
