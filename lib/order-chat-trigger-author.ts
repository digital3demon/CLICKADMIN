import type { OrderChatCorrectionSource } from "@prisma/client";

export type OrderChatTriggerKaitenComment = {
  id: number;
  text: string;
  authorName?: string | null;
  isCrm?: boolean;
};

export function trimOrderChatAuthorLabel(
  raw: string | null | undefined,
): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.slice(0, 120);
}

/** Подпись источника в панелях корректировок и протетики: «Kaiten — Имя — дата, время». */
export function formatOrderChatSourceDateTime(
  createdAt: string | Date | null | undefined,
): string {
  if (createdAt == null) return "";
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOrderChatSourceCaption(
  source: OrderChatCorrectionSource,
  authorLabel?: string | null,
  createdAt?: string | Date | null,
): string {
  const base = source === "KAITEN" ? "Kaiten" : "Канбан";
  const who = trimOrderChatAuthorLabel(authorLabel);
  const when = formatOrderChatSourceDateTime(createdAt);
  const parts = [base];
  if (who) parts.push(who);
  if (when) parts.push(when);
  return parts.join(" — ");
}

/** Заголовок глобального уведомления (тост): «Тип — автор — дата, время». */
function orderChatToastKindLabel(
  kind: "correction" | "prosthetics" | "chat" | "personal",
): string {
  if (kind === "correction") return "Корректировка";
  if (kind === "prosthetics") return "Заказ протетики";
  if (kind === "personal") return "Для вас";
  return "Чат";
}

export function orderChatToastTitle(
  kind: "correction" | "prosthetics" | "chat" | "personal",
  authorLabel?: string | null,
  createdAt?: string | Date | null,
): string {
  const parts = [orderChatToastKindLabel(kind)];
  const who = trimOrderChatAuthorLabel(authorLabel);
  const when = formatOrderChatSourceDateTime(createdAt);
  if (who) parts.push(who);
  if (when) parts.push(when);
  return parts.join(" — ");
}

export function mapParsedKaitenCommentsForTriggerSync(
  parsed: ReadonlyArray<{
    id: number;
    text: string;
    authorName?: string | null;
    isCrm?: boolean;
  }>,
): OrderChatTriggerKaitenComment[] {
  return parsed.map((c) => ({
    id: c.id,
    text: c.text,
    authorName: c.authorName,
    isCrm: c.isCrm,
  }));
}
