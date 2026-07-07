import { stripKaitenDescriptionForKanbanBody } from "@/lib/kanban/kaiten-linked-order";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import type { KanbanCard } from "@/lib/kanban/types";

const SERVICE_TAIL_RES = [
  /\n\nНаряд в CRM\.[^\n]*$/u,
  /\n\nТакже в Kaiten:[^\n]*$/u,
  /\n\nКарточка канбана в CRM\s*$/u,
];

/** Текст описания для hover-предпросмотра (без служебных хвостов CRM/Kaiten). */
export function kanbanCardHoverPreviewBody(card: KanbanCard): string {
  const raw = (card.description || "").trim();
  if (!raw) return "";
  let body = stripKaitenDescriptionForKanbanBody(raw);
  for (const re of SERVICE_TAIL_RES) {
    body = body.replace(re, "").trim();
  }
  return body || raw;
}

function fileCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} файл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} файла`;
  return `${count} файлов`;
}

/** Строки метаданных в подвале всплывашки. */
export function kanbanCardHoverPreviewFooterLines(card: KanbanCard): string[] {
  const lines: string[] = [];
  if (card.linkedOrderId?.trim()) {
    lines.push("Наряд CRM");
  }
  const stageDue = getKanbanStageDue(card);
  if (stageDue) lines.push(`Срок: ${stageDue}`);
  if (card.urgent) lines.push("Срочно");
  const cl = card.checklist || [];
  if (cl.length > 0) {
    const done = cl.filter((i) => i.completed).length;
    lines.push(`Чеклист ${done}/${cl.length}`);
  }
  const files = card.files?.length ?? 0;
  if (files > 0) lines.push(fileCountLabel(files));
  if (card.continuesFromOrderNumber?.trim()) {
    lines.push(`Продолжение ${card.continuesFromOrderNumber.trim()}`);
  }
  return lines;
}

/** Текст причины блокировки для hover-предпросмотра; только если карточка заблокирована. */
export function kanbanCardHoverPreviewBlockReason(
  card: KanbanCard,
): string | null {
  if (!card.blocked) return null;
  const reason = (card.blockReason || "").trim();
  return reason || "Без указания причины";
}

export function clampKanbanHoverPreviewPosition(
  x: number,
  y: number,
  opts?: { width?: number; height?: number },
): { left: number; top: number } {
  const width = opts?.width ?? 288;
  const height = opts?.height ?? 220;
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  return {
    left: Math.max(8, Math.min(x + 14, vw - width - 8)),
    top: Math.max(8, Math.min(y + 14, vh - height)),
  };
}
