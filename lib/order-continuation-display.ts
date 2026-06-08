import { OrderStatus } from "@prisma/client";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";

export type ContinuationOrderRef = {
  orderNumber: string;
  orderId?: string | null;
  kaitenCardId?: number | null;
};

/** @deprecated alias */
export type ContinuationParentRef = ContinuationOrderRef;

/** Активные наряды-продолжения (не архив, не отменён). */
export const activeContinuationChildrenWhere = {
  archivedAt: null,
  status: { not: OrderStatus.CANCELLED },
} as const;

export function mapContinuationChildrenRefs(
  rows: {
    id: string;
    orderNumber: string;
    kaitenCardId: number | null;
  }[],
): ContinuationOrderRef[] {
  return rows.map((row) => ({
    orderId: row.id,
    orderNumber: row.orderNumber,
    kaitenCardId: row.kaitenCardId,
  }));
}

/** Строка для описания карточки Kaiten (markdown-ссылка при наличии kaitenCardId). */
export function buildKaitenContinuationLine(
  parent: ContinuationOrderRef,
): string {
  const num = parent.orderNumber.trim();
  if (!num) return "";
  const kid = parent.kaitenCardId;
  if (kid != null && Number.isFinite(kid)) {
    const url = getKaitenCardWebUrl(kid);
    if (url) return `Продолжение работы [${num}](${url})`;
  }
  return `Продолжение работы ${num}`;
}

/** Строка «у этой работы есть продолжение» для Kaiten. */
export function buildKaitenContinuationFollowupLine(
  child: ContinuationOrderRef,
): string {
  const num = child.orderNumber.trim();
  if (!num) return "";
  const kid = child.kaitenCardId;
  if (kid != null && Number.isFinite(kid)) {
    const url = getKaitenCardWebUrl(kid);
    if (url) return `У этой работы есть продолжение [${num}](${url})`;
  }
  return `У этой работы есть продолжение ${num}`;
}

/** Строка для описания карточки CRM-канбана (относительная ссылка на карточку родителя). */
export function buildKanbanContinuationLine(
  parent: ContinuationOrderRef,
): string {
  const num = parent.orderNumber.trim();
  if (!num) return "";
  const orderId = parent.orderId?.trim();
  if (orderId) {
    const path = kanbanOrderDeepLinkPath(orderId);
    return `Продолжение работы [${num}](${path})`;
  }
  return `Продолжение работы ${num}`;
}

/** Строка «у этой работы есть продолжение» для CRM-канбана. */
export function buildKanbanContinuationFollowupLine(
  child: ContinuationOrderRef,
): string {
  const num = child.orderNumber.trim();
  if (!num) return "";
  const orderId = child.orderId?.trim();
  if (orderId) {
    const path = kanbanOrderDeepLinkPath(orderId);
    return `У этой работы есть продолжение [${num}](${path})`;
  }
  return `У этой работы есть продолжение ${num}`;
}

export function buildKaitenContinuationBlockLines(
  parent: ContinuationOrderRef | null | undefined,
  children: ContinuationOrderRef[] | null | undefined,
): string[] {
  const lines: string[] = [];
  if (parent) {
    const line = buildKaitenContinuationLine(parent);
    if (line) lines.push(line);
  }
  for (const child of children ?? []) {
    const line = buildKaitenContinuationFollowupLine(child);
    if (line) lines.push(line);
  }
  return lines;
}

/** Префикс блоков продолжения для Kaiten при редактировании тела описания из канбана CRM. */
export function kaitenDescriptionWithContinuationPrefix(
  body: string,
  parent: ContinuationOrderRef | null | undefined,
  children?: ContinuationOrderRef[] | null,
): string {
  const blocks = buildKaitenContinuationBlockLines(parent, children);
  const tail = body.trim();
  if (blocks.length === 0) return tail;
  if (!tail) return blocks.join("\n\n");
  return `${blocks.join("\n\n")}\n\n${tail}`;
}
