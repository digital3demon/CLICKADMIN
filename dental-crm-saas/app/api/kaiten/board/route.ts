import { NextResponse } from "next/server";
import type { KaitenTrackLane } from "@prisma/client";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import {
  getKaitenRestAuth,
  kaitenListBoardColumns,
  kaitenListBoardLanes,
} from "@/lib/kaiten-rest";

const LANES: KaitenTrackLane[] = ["ORTHOPEDICS", "ORTHODONTICS", "TEST"];

export async function GET(req: Request) {
  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }
  const cfg = await withResolvedKaitenBoards(cfg0);

  const { searchParams } = new URL(req.url);
  const laneRaw = searchParams.get("lane")?.trim();
  if (!laneRaw || !LANES.includes(laneRaw as KaitenTrackLane)) {
    return NextResponse.json({ error: "Укажите lane" }, { status: 400 });
  }
  const lane = laneRaw as KaitenTrackLane;
  const target = cfg.boardByLane[lane];
  if (!target || target.boardId == null) {
    return NextResponse.json(
      { error: "Это пространство не настроено в .env (нет board/column)" },
      { status: 400 },
    );
  }
  const boardId = target.boardId;

  const cols = await kaitenListBoardColumns(auth, boardId);
  if (!cols.ok) {
    return NextResponse.json(
      {
        error:
          cols.status === 429
            ? "Слишком много запросов к Kaiten. Подождите минуту и снова смените пространство."
            : cols.error ?? "Не удалось загрузить колонки доски",
      },
      { status: cols.status === 429 ? 429 : 502 },
    );
  }
  const lns = await kaitenListBoardLanes(auth, boardId);
  if (!lns.ok) {
    return NextResponse.json(
      {
        error:
          lns.status === 429
            ? "Слишком много запросов к Kaiten. Подождите минуту и снова смените пространство."
            : lns.error ?? "Не удалось загрузить дорожки доски",
      },
      { status: lns.status === 429 ? 429 : 502 },
    );
  }

  return NextResponse.json({
    boardId,
    lane,
    columns: cols.columns,
    lanes: lns.lanes,
    defaultColumnId: target.columnToExecutionId,
    defaultLaneId: target.laneId,
  });
}
