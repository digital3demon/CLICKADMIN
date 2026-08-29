/**
 * Telegram: «вас добавили / исключили» и «установлен срок».
 * Кто сделал, какая карточка (ссылка = заголовок), какой срок (ДД.ММ.ГГ).
 */
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";

export type KanbanPersonDueTelegramKind =
  | "added_participant"
  | "added_assignee"
  | "removed"
  | "due_set"
  | "due_cleared";

/** YYYY-MM-DD → ДД.ММ.ГГ. Пустое — «—», мусор как есть. */
export function formatKanbanDueYmdForTelegram(ymd: string): string {
  const s = String(ymd || "").trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s || "—";
  return `${m[3]}.${m[2]}.${m[1]!.slice(2)}`;
}

export function buildKanbanPersonDueTelegramLines(opts: {
  kind: KanbanPersonDueTelegramKind;
  actorLabel: string;
  cardTitle: string;
  cardUrl: string;
  orderUrl?: string | null;
  dueYmd?: string | null;
}): {
  lines: string[];
  linesAdmin?: string[];
  linesSelf?: string[];
  linesSelfAdmin?: string[];
} {
  const who = escapeTelegramHtml(
    (opts.actorLabel || "").trim() || "Пользователь",
  );
  const title = (opts.cardTitle || "").trim() || "Без названия";
  const cardUrl = (opts.cardUrl || "").trim();
  const cardLink = cardUrl ? telegramHtmlLink(cardUrl, title) : escapeTelegramHtml(title);
  const dueLabel = formatKanbanDueYmdForTelegram(opts.dueYmd || "");

  const line =
    opts.kind === "added_participant"
      ? `${who} добавил(а) вас в карточку ${cardLink}`
      : opts.kind === "added_assignee"
        ? `${who} добавил(а) вас в карточку ${cardLink} как ответственного`
        : opts.kind === "removed"
          ? `${who} исключил(а) вас из карточки ${cardLink}`
          : opts.kind === "due_set"
            ? `${who} установил(а) срок ${escapeTelegramHtml(dueLabel)} в карточке ${cardLink}`
            : `${who} снял(а) срок в карточке ${cardLink}`;

  const selfLine =
    opts.kind === "added_participant"
      ? `Вы добавили себя в карточку ${cardLink}`
      : opts.kind === "added_assignee"
        ? `Вы добавили себя в карточку ${cardLink} как ответственного`
        : opts.kind === "removed"
          ? `Вы исключили себя из карточки ${cardLink}`
          : opts.kind === "due_set"
            ? `Вы установили срок ${escapeTelegramHtml(dueLabel)} в карточке ${cardLink}`
            : `Вы сняли срок в карточке ${cardLink}`;

  const orderUrl = (opts.orderUrl || "").trim();
  if (!orderUrl || !cardUrl) {
    return {
      lines: [line],
      ...(selfLine ? { linesSelf: [selfLine] } : {}),
    };
  }
  const cardWord = telegramHtmlLink(cardUrl, "карточке");
  const orderWord = telegramHtmlLink(orderUrl, "заказе");
  const titleHtml = escapeTelegramHtml(title);
  const admin =
    opts.kind === "added_participant"
      ? `${who} добавил(а) вас в ${cardWord} и ${orderWord} (${titleHtml})`
      : opts.kind === "added_assignee"
        ? `${who} добавил(а) вас как ответственного в ${cardWord} и ${orderWord} (${titleHtml})`
        : opts.kind === "removed"
          ? `${who} исключил(а) вас из ${cardWord} и ${orderWord} (${titleHtml})`
          : opts.kind === "due_set"
            ? `${who} установил(а) срок ${escapeTelegramHtml(dueLabel)} в ${cardWord} и ${orderWord} (${titleHtml})`
            : `${who} снял(а) срок в ${cardWord} и ${orderWord} (${titleHtml})`;
  const selfAdmin =
    opts.kind === "added_participant"
      ? `Вы добавили себя в ${cardWord} и ${orderWord} (${titleHtml})`
      : opts.kind === "added_assignee"
        ? `Вы добавили себя как ответственного в ${cardWord} и ${orderWord} (${titleHtml})`
        : opts.kind === "removed"
          ? `Вы исключили себя из ${cardWord} и ${orderWord} (${titleHtml})`
          : opts.kind === "due_set"
            ? `Вы установили срок ${escapeTelegramHtml(dueLabel)} в ${cardWord} и ${orderWord} (${titleHtml})`
            : `Вы сняли срок в ${cardWord} и ${orderWord} (${titleHtml})`;
  return {
    lines: [line],
    linesAdmin: [admin],
    ...(selfLine ? { linesSelf: [selfLine] } : {}),
    ...(selfAdmin ? { linesSelfAdmin: [selfAdmin] } : {}),
  };
}
