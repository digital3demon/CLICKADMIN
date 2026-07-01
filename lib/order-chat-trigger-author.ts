import type { OrderChatCorrectionSource } from "@prisma/client";

export type OrderChatTriggerKaitenComment = {
  id: number;
  text: string;
  authorName?: string | null;
};

export function trimOrderChatAuthorLabel(
  raw: string | null | undefined,
): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.slice(0, 120);
}

/** Подпись источника в панелях корректировок и протетики: «Kaiten · Имя». */
export function formatOrderChatSourceCaption(
  source: OrderChatCorrectionSource,
  authorLabel?: string | null,
): string {
  const base = source === "KAITEN" ? "Kaiten" : "Канбан";
  const who = trimOrderChatAuthorLabel(authorLabel);
  return who ? `${base} · ${who}` : base;
}

export function mapParsedKaitenCommentsForTriggerSync(
  parsed: ReadonlyArray<{
    id: number;
    text: string;
    authorName?: string | null;
  }>,
): OrderChatTriggerKaitenComment[] {
  return parsed.map((c) => ({
    id: c.id,
    text: c.text,
    authorName: c.authorName,
  }));
}
