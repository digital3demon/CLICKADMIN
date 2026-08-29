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

/** «Вас добавили / исключили» и свой срок: автор получает linesSelf, если он в targets. */
export const PERSONAL_SELF_TELEGRAM_EVENTS = [
  "tg_person_added_to_card",
  "tg_person_assigned_responsible",
  "tg_person_removed_from_card",
  "tg_due_changed",
] as const satisfies readonly KanbanTelegramPrefKey[];

/** Если есть linesSelf — автор должен быть в targets (срок без людей на карточке). */
export function mergeTelegramSelfActorIntoTargets(
  targetUserIds: readonly string[],
  actorUserId: string | null | undefined,
  hasLinesSelf: boolean,
): string[] {
  if (!hasLinesSelf) return uniqTelegramTargetUserIds(targetUserIds);
  const actor = String(actorUserId || "").trim();
  return uniqTelegramTargetUserIds(targetUserIds, actor ? [actor] : []);
}

export function isPersonalSelfTelegramEvent(
  event: KanbanTelegramPrefKey,
): boolean {
  return (PERSONAL_SELF_TELEGRAM_EVENTS as readonly string[]).includes(event);
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
