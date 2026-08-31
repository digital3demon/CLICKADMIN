/**
 * Автоматизации канбана — отдельный tenant-ключ.
 * kanbanAppStateV3 часто не пишется (sparse-guard / уход со страницы),
 * из‑за этого правила в «Конфигурация → Канбан» пропадали после F5.
 */
import { normalizeArchiveAfterHours } from "@/lib/kanban/automations";
import type {
  KanbanAppState,
  KanbanAutomationAction,
  KanbanAutomationRule,
  KanbanAutomationTrigger,
} from "@/lib/kanban/types";

export const KANBAN_AUTOMATIONS_KEY = "kanbanAutomationsV1";

export type KanbanAutomationsSnapshot = {
  version: 1;
  rules: KanbanAutomationRule[];
};

const TRIGGERS = new Set<KanbanAutomationTrigger>([
  "card_moved_to_column",
  "card_created_in_column",
  "card_blocked",
  "card_unblocked",
]);

function normalizeAction(raw: unknown): KanbanAutomationAction | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const a = raw as Record<string, unknown>;
  const type = String(a.type || "");
  if (type === "move_to_column") {
    return { type, columnId: String(a.columnId ?? "") };
  }
  if (type === "add_assignee" || type === "remove_assignee" || type === "add_participant" || type === "remove_participant") {
    return { type, userId: String(a.userId ?? "") };
  }
  if (type === "set_urgent" || type === "clear_urgent" || type === "unblock" || type === "complete_checklists") {
    return { type };
  }
  if (type === "archive") {
    return { type, afterHours: normalizeArchiveAfterHours(a.afterHours ?? 48) };
  }
  if (type === "set_due_in_days") {
    const days = Number(a.days);
    return { type, days: Number.isFinite(days) ? days : 0 };
  }
  if (type === "clear_due") return { type };
  if (type === "add_comment") {
    return { type, text: String(a.text ?? "") };
  }
  if (type === "set_card_type") {
    return { type, cardTypeId: String(a.cardTypeId ?? "") };
  }
  if (type === "block") {
    return { type, reason: String(a.reason ?? "") };
  }
  return null;
}

function normalizeRule(raw: unknown): KanbanAutomationRule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  if (!id) return null;
  const triggerRaw = String(r.trigger ?? "");
  const trigger = TRIGGERS.has(triggerRaw as KanbanAutomationTrigger)
    ? (triggerRaw as KanbanAutomationTrigger)
    : "card_moved_to_column";
  const actions = Array.isArray(r.actions)
    ? r.actions.map(normalizeAction).filter((x): x is KanbanAutomationAction => x != null)
    : [];
  const cardTypeIds = Array.isArray(r.cardTypeIds)
    ? [
        ...new Set(
          r.cardTypeIds.map((x) => String(x || "").trim()).filter(Boolean),
        ),
      ]
    : [];
  const cardTypeId = String(r.cardTypeId ?? "").trim();
  const types = cardTypeIds.length ? cardTypeIds : cardTypeId ? [cardTypeId] : [];
  return {
    id,
    enabled: r.enabled !== false,
    name: String(r.name ?? "").slice(0, 160),
    boardId: String(r.boardId ?? ""),
    trigger,
    columnId: String(r.columnId ?? ""),
    fromColumnId: String(r.fromColumnId ?? ""),
    cardTypeId: types[0] ?? "",
    cardTypeIds: types,
    actions,
  };
}

export function normalizeKanbanAutomations(
  raw: unknown,
): KanbanAutomationsSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as { version?: unknown; rules?: unknown };
  if (o.version !== 1 || !Array.isArray(o.rules)) return null;
  const seen = new Set<string>();
  const rules: KanbanAutomationRule[] = [];
  for (const item of o.rules) {
    const rule = normalizeRule(item);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    rules.push(rule);
    if (rules.length >= 80) break;
  }
  return { version: 1, rules };
}

function firstBoardRules(state: KanbanAppState): KanbanAutomationRule[] {
  for (const board of state.boards || []) {
    const list = board.automations || [];
    if (list.length > 0) return list;
  }
  return state.boards[0]?.automations || [];
}

export function extractKanbanAutomations(
  state: KanbanAppState,
): KanbanAutomationsSnapshot {
  const rules: KanbanAutomationRule[] = [];
  const seen = new Set<string>();
  for (const item of firstBoardRules(state)) {
    const rule = normalizeRule(item);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    rules.push(rule);
  }
  return { version: 1, rules };
}

export function applyKanbanAutomations(
  state: KanbanAppState,
  snapshot: unknown,
): KanbanAppState {
  const snap = normalizeKanbanAutomations(snapshot);
  if (!snap) return state;
  const next = structuredClone(state);
  let changed = false;
  for (const board of next.boards) {
    const nextRules = snap.rules.map((r) => ({
      ...r,
      boardId: String(r.boardId || board.id),
    }));
    const prev = JSON.stringify(board.automations || []);
    const incoming = JSON.stringify(nextRules);
    if (prev === incoming) continue;
    board.automations = nextRules;
    changed = true;
  }
  return changed ? next : state;
}
