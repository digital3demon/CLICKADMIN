import { stripOrderChatCorrectionPrefix } from "@/lib/order-chat-correction";
import { stripOrderProstheticsRequestPrefix } from "@/lib/order-prosthetics-request";
import { stripOrderChatPtMemoPrefix } from "@/lib/order-chat-pt-memo";

export type KanbanChatMessageKind = "plain" | "correction" | "prosthetics" | "pt";

export type KanbanChatMessageDisplay = {
  kind: KanbanChatMessageKind;
  /** Подпись внутри пузыря («Корректировка», «Заказ протетики»). */
  label: string | null;
  /** Текст без «!!!» / «???». */
  body: string;
};

export function formatKanbanChatMessageDisplay(text: string): KanbanChatMessageDisplay {
  const correctionBody = stripOrderChatCorrectionPrefix(text);
  if (correctionBody != null) {
    return { kind: "correction", label: "Корректировка", body: correctionBody };
  }
  const prostheticsBody = stripOrderProstheticsRequestPrefix(text);
  if (prostheticsBody != null) {
    return { kind: "prosthetics", label: "Заказ протетики", body: prostheticsBody };
  }
  const ptBody = stripOrderChatPtMemoPrefix(text);
  if (ptBody != null) {
    return { kind: "pt", label: "ПТ", body: ptBody };
  }
  return { kind: "plain", label: null, body: text };
}

export function shouldShowKanbanChatSyncStatus(
  _kind: KanbanChatMessageKind,
  syncStatus: string | undefined,
): boolean {
  if (!syncStatus || syncStatus === "synced") return false;
  return (
    syncStatus === "failed" ||
    syncStatus === "pending" ||
    syncStatus === "retried" ||
    syncStatus === "local"
  );
}

/** Оболочка пузыря в модалке карточки канбана (тёмная тема). */
export function kanbanChatMessageShellClass(kind: KanbanChatMessageKind): string {
  if (kind === "correction") {
    return "mb-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";
  }
  if (kind === "prosthetics") {
    return "mb-2 rounded-md border border-sky-400/40 bg-sky-400/10 px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";
  }
  if (kind === "pt") {
    return "mb-2 rounded-md border border-violet-400/40 bg-violet-400/10 px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";
  }
  return "mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";
}

export function kanbanChatMessageLabelClass(kind: KanbanChatMessageKind): string {
  if (kind === "correction") {
    return "mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-amber-200/90";
  }
  if (kind === "prosthetics") {
    return "mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sky-200/90";
  }
  if (kind === "pt") {
    return "mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-violet-200/90";
  }
  return "";
}

/** Оболочка пузыря в списке нарядов / светлой теме. */
export function orderListChatMessageShellClass(kind: KanbanChatMessageKind): string {
  const base = "rounded-md border px-3 py-2";
  if (kind === "correction") {
    return `${base} border-amber-200/80 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/25`;
  }
  if (kind === "prosthetics") {
    return `${base} border-sky-200/80 bg-sky-50/50 dark:border-sky-800/50 dark:bg-sky-950/25`;
  }
  if (kind === "pt") {
    return `${base} border-violet-200/80 bg-violet-50/50 dark:border-violet-800/50 dark:bg-violet-950/25`;
  }
  return `${base} border-[var(--border-subtle)] bg-[var(--surface-subtle)]`;
}

export function orderListChatMessageLabelClass(kind: KanbanChatMessageKind): string {
  if (kind === "correction") {
    return "mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/90";
  }
  if (kind === "prosthetics") {
    return "mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200/90";
  }
  if (kind === "pt") {
    return "mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200/90";
  }
  return "";
}
