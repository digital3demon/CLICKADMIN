/** Поля наряда для карточки CRM-канбана (есть всегда; kaitenCardId — после публикации в Kaiten). */
export type KaitenLinkedOrderForKanban = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorFullName: string;
  /** Полный ISO срока лабораторного (для шапки карточки); первая часть — календарная дата для бейджа. */
  dueDate: string | null;
  /** Дата записи пациента (как в списке заказов «Актуальное»). */
  appointmentDate: string | null;
  dueToAdminsAt: string | null;
  kaitenAdminDueHasTime: boolean | null;
  kaitenCardTitleLabel: string | null;
  kaitenCardTypeId: string | null;
  kaitenCardTypeName: string | null;
  /** Дорожка Kaiten → доска канбана «Ортопедия» / «Ортодонтия». */
  kaitenTrackLane: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  kaitenCardId: number | null;
  /** Подпись колонки Kaiten в CRM (обновляется GET/PATCH Kaiten и фоновой синхронизацией). */
  kaitenColumnTitle: string | null;
  /** Порядок карточки в колонке Kaiten (`sort_order` в API). */
  kaitenCardSortOrder: number | null;
  /** Кэш заголовка карточки Kaiten (последний push из наряда). */
  kaitenCardTitleMirror: string | null;
  kaitenCardDescriptionMirror: string | null;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  /** ISO начала текущей блокировки в Kaiten (если сохранено в CRM) */
  kaitenBlockedAt: string | null;
  /** Демо / внутренний канбан: NEW | IN_PROGRESS | DONE */
  demoKanbanColumn: string | null;
  /** Первая позиция из прайса (PRICE_LIST) — для типа карточки канбана в демо */
  primaryPriceListItemName: string | null;
  /** Текст заказа от клиента и комментарий от админов — в описание карточки канбана */
  clientOrderText: string | null;
  notes: string | null;
  /** Родительский наряд для «продолжения работы». */
  continuesFromOrder?: {
    id: string;
    orderNumber: string;
    kaitenCardId: number | null;
  } | null;
  /** Наряды-продолжения этой работы. */
  continuationFollowups?: {
    id: string;
    orderNumber: string;
    kaitenCardId: number | null;
  }[];
  /** Вложения наряда (без счёта-фактуры) — показываются в модалке канбана как «Файлы». */
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string | null;
    size: number;
    createdAt: string;
  }[];
  /** Писем, привязанных к наряду через EmailSourceOrder. */
  sourceEmailCount?: number;
  /** CRM-канбан: ответственные / участники с наряда. */
  assignees?: string[];
  participants?: string[];
};

const CONTINUATION_HEAD_RE =
  /^(Продолжение работы|У этой работы есть продолжение)/u;

import { dedupeDuplicateBracketUrls } from "@/lib/mail/mail-text-cleanup";

/** Убирает блоки «продолжение» и служебный хвост CRM — они в канбане отдельно. */
export function stripKaitenDescriptionForKanbanBody(text: string): string {
  let body = dedupeDuplicateBracketUrls(text).trim();
  while (body) {
    const lines = body.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (CONTINUATION_HEAD_RE.test(first)) {
      let i = 1;
      while (i < lines.length && lines[i]?.trim() === "") i += 1;
      body = lines.slice(i).join("\n").trim();
      continue;
    }
    break;
  }
  return body
    .replace(/\n\nНаряд в CRM\. Карточка Kaiten: #\d+\s*$/u, "")
    .replace(/\n\nТакже в Kaiten: #\d+\s*$/u, "")
    .replace(/\n\nКарточка канбана в CRM\s*$/u, "")
    .trim();
}

function kanbanDescriptionTail(
  row: Pick<KaitenLinkedOrderForKanban, "kaitenCardId">,
  demo: boolean,
): string {
  if (demo) {
    return row.kaitenCardId != null
      ? `Также в Kaiten: #${row.kaitenCardId}`
      : "Карточка канбана в CRM";
  }
  return row.kaitenCardId != null
    ? `Наряд в CRM. Карточка Kaiten: #${row.kaitenCardId}`
    : "Наряд в CRM. Карточка Kaiten ещё не создана.";
}

/** Slim list-hydrate не отдаёт тексты — нельзя затирать полное описание хвостом «Наряд в CRM…». */
export function linkedOrderRowHasDescriptionBody(
  row: Pick<
    KaitenLinkedOrderForKanban,
    "clientOrderText" | "notes" | "kaitenCardDescriptionMirror"
  >,
): boolean {
  return Boolean(
    row.clientOrderText?.trim() ||
      row.notes?.trim() ||
      row.kaitenCardDescriptionMirror?.trim(),
  );
}

/** Описание карточки CRM-канбана: зеркало Kaiten и поля наряда — берём более полное. */
export function resolveLinkedOrderKanbanDescription(
  row: Pick<
    KaitenLinkedOrderForKanban,
    "clientOrderText" | "notes" | "kaitenCardId" | "kaitenCardDescriptionMirror"
  >,
  demo: boolean,
): string {
  const tail = kanbanDescriptionTail(row, demo);
  const fromFields = buildKanbanDescriptionFromOrderFields(row);
  const mirror = row.kaitenCardDescriptionMirror?.trim();
  const fromMirror =
    mirror && row.kaitenCardId != null
      ? stripKaitenDescriptionForKanbanBody(mirror)
      : "";

  // Короткое/устаревшее зеркало не должно перекрывать полный clientOrderText
  // (в tenant JSON описание раньше ужимали до 120 символов и могли записать обратно).
  const body =
    fromMirror.length >= fromFields.length ? fromMirror : fromFields;
  return body ? `${body}\n\n${tail}` : tail;
}

function buildKanbanDescriptionFromOrderFields(
  row: Pick<KaitenLinkedOrderForKanban, "clientOrderText" | "notes">,
): string {
  const blocks: string[] = [];
  const client = row.clientOrderText?.trim();
  const notes = row.notes?.trim();
  if (client) blocks.push(`Заказ от клиента:\n${client}`);
  if (notes) blocks.push(`Комментарий от админов:\n${notes}`);
  return blocks.join("\n\n");
}

/** Заголовок карточки канбана — всегда из полей наряда (наряд главный). */
export function resolveLinkedOrderKanbanTitle(
  _row: Pick<KaitenLinkedOrderForKanban, "kaitenCardTitleMirror">,
  titleFromOrder: string,
): string {
  return titleFromOrder;
}
