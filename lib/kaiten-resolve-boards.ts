import type { KaitenTrackLane } from "@prisma/client";
import {
  type KaitenBoardTarget,
  type KaitenEnvConfig,
  KAITEN_LANE_ORDER,
} from "@/lib/kaiten-config";
import {
  type KaitenHttpOpts,
  getKaitenRestAuth,
  kaitenFirstBoardIdInSpace,
} from "@/lib/kaiten-rest";

function needsResolution(cfg: KaitenEnvConfig): boolean {
  for (const lane of KAITEN_LANE_ORDER) {
    const t = cfg.boardByLane[lane];
    if (t != null && t.boardId == null && t.spaceId != null) return true;
  }
  return false;
}

/**
 * Подставляет `board_id` из `space_id` (URL `/space/{id}/`) перед вызовами Kaiten.
 * Результат кэшируется на несколько минут.
 */
export async function withResolvedKaitenBoards(
  cfg: KaitenEnvConfig,
  httpOpts?: KaitenHttpOpts,
): Promise<KaitenEnvConfig> {
  if (!needsResolution(cfg)) return cfg;

  const auth = getKaitenRestAuth();
  if (!auth) return cfg;

  const boardByLane: KaitenEnvConfig["boardByLane"] = { ...cfg.boardByLane };

  for (const lane of KAITEN_LANE_ORDER) {
    const t = boardByLane[lane];
    if (t == null || t.boardId != null || t.spaceId == null) continue;
    const r = await kaitenFirstBoardIdInSpace(auth, t.spaceId, httpOpts);
    if (!r.ok || r.boardId == null) {
      console.error(
        "[kaiten] withResolvedKaitenBoards: не удалось получить board_id для",
        lane,
        "spaceId=",
        t.spaceId,
        r.error,
      );
      continue;
    }
    const next: KaitenBoardTarget = {
      ...t,
      boardId: r.boardId,
      spaceId: null,
    };
    boardByLane[lane] = next;
  }

  return { ...cfg, boardByLane };
}
