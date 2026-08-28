import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";

/**
 * События карточки/наряда: только ответственные и участники, не вся лаборатория.
 * Упоминания, «вас добавили» и производство сюда не входят.
 */
export const CARD_MEMBER_SCOPED_TELEGRAM_EVENTS = [
  "tg_kanban_crm_sync",
  "tg_block_added",
  "tg_card_unblocked",
  "tg_comment_added",
  "tg_description_changed",
  "tg_due_changed",
  "tg_order_correction_changed",
  "tg_order_prosthetics_changed",
] as const satisfies readonly KanbanTelegramPrefKey[];

export function isCardMemberScopedTelegramEvent(
  event: KanbanTelegramPrefKey,
): boolean {
  return (CARD_MEMBER_SCOPED_TELEGRAM_EVENTS as readonly string[]).includes(
    event,
  );
}

export function uniqTelegramTargetUserIds(
  ...lists: Array<readonly string[] | undefined | null>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list || []) {
      const id = String(raw || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function kanbanCardTelegramMemberIds(card: {
  assignees?: readonly string[] | null;
  participants?: readonly string[] | null;
}): string[] {
  return uniqTelegramTargetUserIds(card.assignees, card.participants);
}
