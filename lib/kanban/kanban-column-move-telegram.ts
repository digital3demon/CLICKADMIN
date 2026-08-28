/**
 * Текст ТГ при переносе колонки: откуда → куда и кто.
 * «Вы перенесли» — автору, если карточка на нём (ответственный/участник).
 */
import { escapeTelegramHtml } from "@/lib/telegram-html";

function q(title: string): string {
  const t = String(title || "").trim() || "—";
  return `«${escapeTelegramHtml(t)}»`;
}

export function buildKanbanColumnMoveTelegramLines(input: {
  cardLinkHtml: string;
  fromTitle: string;
  toTitle: string;
  actorLabel: string;
  cardWord?: string;
  orderWord?: string;
}): {
  lines: string[];
  linesAdmin?: string[];
  linesSelf: string[];
  linesSelfAdmin?: string[];
} {
  const from = q(input.fromTitle);
  const to = q(input.toTitle);
  const who = escapeTelegramHtml(String(input.actorLabel || "").trim() || "Пользователь");
  const others = `${who} перенёс(ла) карточку из ${from} в ${to}`;
  const self = `Вы перенесли карточку из ${from} в ${to}`;
  const lines = [others, `В ${input.cardLinkHtml}`];
  const linesSelf = [self, `В ${input.cardLinkHtml}`];
  const cardWord = (input.cardWord || "").trim();
  const orderWord = (input.orderWord || "").trim();
  if (cardWord && orderWord) {
    return {
      lines,
      linesAdmin: [others, `В ${cardWord} и ${orderWord}`],
      linesSelf,
      linesSelfAdmin: [self, `В ${cardWord} и ${orderWord}`],
    };
  }
  return { lines, linesSelf };
}
