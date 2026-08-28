/**
 * Карточки на доске без поиска: источник — Order.kaitenTrackLane, не tenant JSON.
 * Поиск (?q=) остаётся отдельным путём (текст + upsert).
 * Timezone не нужен: только фильтр по дорожке и лимит take.
 */

export const KANBAN_LANE_HYDRATE_TAKE = 500;

export const KANBAN_HYDRATE_LANES = [
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
] as const;

export type KanbanHydrateLane = (typeof KANBAN_HYDRATE_LANES)[number];

const HYDRATE_LANE_SET = new Set<string>(KANBAN_HYDRATE_LANES);

export function parseKanbanHydrateLanesParam(
  raw: string | null | undefined,
): KanbanHydrateLane[] {
  if (!raw?.trim()) return [];
  const out: KanbanHydrateLane[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const lane = part.trim().toUpperCase();
    if (!HYDRATE_LANE_SET.has(lane) || seen.has(lane)) continue;
    seen.add(lane);
    out.push(lane as KanbanHydrateLane);
  }
  return out;
}

/** GET /api/kanban/linked-orders: ids / q / lanes. */
export function linkedOrdersApiUrl(
  boardIds: readonly string[],
  search: string,
  opts?: { lanes?: readonly string[] },
): string {
  const p = new URLSearchParams();
  if (boardIds.length > 0) p.set("ids", [...boardIds].join(","));
  const q = search.trim();
  if (q.length >= 2) {
    p.set("q", q);
  } else if (opts?.lanes && opts.lanes.length > 0) {
    p.set("lanes", [...opts.lanes].join(","));
  }
  const qs = p.toString();
  return qs ? `/api/kanban/linked-orders?${qs}` : "/api/kanban/linked-orders";
}
