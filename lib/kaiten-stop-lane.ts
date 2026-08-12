/**
 * Дорожка «СТОП» на доске Kaiten (swimlane внизу; у ортопедии и ортодонтии — своя).
 * Карта: CRM «В стоп» → lane СТОП на текущей доске карточки.
 */

import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import type { KaitenTrackLane } from "@prisma/client";

/** Нормализованные имена дорожки СТОП в Kaiten. */
const STOP_LANE_TITLES = new Set(["стоп", "stop"]);

export function isKaitenStopLaneTitle(raw: string | null | undefined): boolean {
  const n = normalizeKanbanColumnTitle(String(raw || ""));
  if (!n) return false;
  if (STOP_LANE_TITLES.has(n)) return true;
  // «СТОП / пауза», «Стоп (hold)» и т.п.
  return n === "стоп" || n.startsWith("стоп ") || n.startsWith("stop ");
}

export function findKaitenStopLaneId(
  lanes: Array<{ id: number; title: string }>,
): number | null {
  for (const lane of lanes) {
    if (isKaitenStopLaneTitle(lane.title)) return lane.id;
  }
  return null;
}

/**
 * Явный id дорожки СТОП из env (если название на доске нестандартное).
 * `KAITEN_ORTHOPEDICS_STOP_LANE_ID` / `KAITEN_ORTHODONTICS_STOP_LANE_ID` / `KAITEN_TEST_STOP_LANE_ID`.
 */
export function kaitenStopLaneIdFromEnv(
  track: KaitenTrackLane | null | undefined,
): number | null {
  const key =
    track === "ORTHODONTICS"
      ? "KAITEN_ORTHODONTICS_STOP_LANE_ID"
      : track === "TEST"
        ? "KAITEN_TEST_STOP_LANE_ID"
        : track === "ORTHOPEDICS"
          ? "KAITEN_ORTHOPEDICS_STOP_LANE_ID"
          : null;
  if (!key) return null;
  const raw = process.env[key]?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
