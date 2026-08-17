/**
 * Поиск карточек канбана.
 * Timezone не используется. Границы токенов — пробел, не JS `\b` (кириллица).
 */
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";

/** Латиница, визуально как кириллица — после toLocaleLowerCase. */
const LAT_LOOKALIKE_TO_CYR: Record<string, string> = {
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  x: "х",
  y: "у",
  t: "т",
  h: "н",
  k: "к",
  m: "м",
  b: "в",
};

export function foldKanbanSearchText(raw: string): string {
  return String(raw || "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[aeopcxythkmb]/g, (ch) => LAT_LOOKALIKE_TO_CYR[ch] ?? ch);
}

/** Слова запроса; пробел режет токены (кириллица до и после). */
export function kanbanSearchTokens(raw: string): string[] {
  const folded = foldKanbanSearchText(raw).replace(/\s+/g, " ").trim();
  if (!folded) return [];
  return folded.split(" ").filter(Boolean);
}

export function kanbanCardSearchHaystack(
  card: KanbanCard,
  board?: KanbanBoard | null,
): string {
  const typeName =
    board?.cardTypes?.find((t) => t.id === card.cardTypeId)?.name ?? "";
  const comments = (card.comments || []).map((c) => c.text || "").join(" ");
  const files = (card.files || []).map((f) => f.name || "").join(" ");
  const activity = (card.activity || []).map((a) => a.text || "").join(" ");
  const checklist = (card.checklist || []).map((i) => i.text || "").join(" ");
  /* linkedOrderId / cuid не в стоге: «214» не должно цеплять случайный фрагмент id. */
  return [
    card.title,
    card.description,
    typeName,
    comments,
    files,
    activity,
    checklist,
    card.continuesFromOrderNumber,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Цифровые прогоны: «214» ≠ «14» в дате 14.08 и ≠ фрагмент cuid. */
export function haystackDigitRuns(folded: string): string[] {
  return String(folded || "").match(/\d+/g) ?? [];
}

function tokenMatchesHaystack(token: string, hay: string): boolean {
  if (/^\d+$/.test(token)) {
    return haystackDigitRuns(hay).includes(token);
  }
  return hay.includes(token);
}

export function kanbanCardMatchesSearch(
  card: KanbanCard,
  query: string,
  board?: KanbanBoard | null,
): boolean {
  const tokens = kanbanSearchTokens(query);
  if (tokens.length === 0) return true;
  const hay = foldKanbanSearchText(kanbanCardSearchHaystack(card, board));
  return tokens.every((t) => tokenMatchesHaystack(t, hay));
}
