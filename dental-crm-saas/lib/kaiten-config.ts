import type { KaitenTrackLane } from "@prisma/client";

/**
 * Доска в Kaiten: `board_id` из API **или** id пространства из URL `/space/{spaceId}/`
 * (подставится id первой доски через GET /spaces/{spaceId}/boards).
 */
export type KaitenBoardTarget = {
  boardId: number | null;
  spaceId: number | null;
  columnToExecutionId: number;
  laneId: number | null;
};

export type KaitenEnvConfig = {
  apiBase: string;
  token: string;
  /** Только те пространства, для которых в .env заданы board_id и колонка «в работу». */
  boardByLane: Partial<Record<KaitenTrackLane, KaitenBoardTarget>>;
};

export const KAITEN_LANE_ORDER: readonly KaitenTrackLane[] = [
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
];

export function listConfiguredKaitenTrackLanes(
  cfg: KaitenEnvConfig,
): KaitenTrackLane[] {
  return KAITEN_LANE_ORDER.filter((l) => cfg.boardByLane[l] != null);
}

function boardTargetsEqual(a: KaitenBoardTarget, b: KaitenBoardTarget): boolean {
  if (
    a.columnToExecutionId !== b.columnToExecutionId ||
    a.laneId !== b.laneId
  ) {
    return false;
  }
  if (a.boardId != null && b.boardId != null) return a.boardId === b.boardId;
  if (a.spaceId != null && b.spaceId != null) return a.spaceId === b.spaceId;
  return false;
}

function parseIntStrict(name: string, raw: string | undefined): number | null {
  const v = raw?.trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) {
    console.warn(`[kaiten] ${name} is not a valid integer`);
    return null;
  }
  return n;
}

/** Есть токен — пробуем синхронизацию (остальные ID проверяются при вызове API). */
export function isKaitenTokenPresent(): boolean {
  return Boolean(process.env.KAITEN_API_TOKEN?.trim());
}

/**
 * Конфигурация досок Kaiten из env. ID типов карточек — в конфигурации CRM (KaitenCardType.externalTypeId).
 */
export function getKaitenEnvConfig(): KaitenEnvConfig | null {
  const token = process.env.KAITEN_API_TOKEN?.trim();
  if (!token) return null;

  const apiBase =
    process.env.KAITEN_API_BASE_URL?.trim() ||
    "https://clicklab.kaiten.ru/api/v1";

  const orthoBoard = parseIntStrict(
    "KAITEN_ORTHOPEDICS_BOARD_ID",
    process.env.KAITEN_ORTHOPEDICS_BOARD_ID,
  );
  const orthoSpaceId = parseIntStrict(
    "KAITEN_ORTHOPEDICS_SPACE_ID",
    process.env.KAITEN_ORTHOPEDICS_SPACE_ID,
  );
  const orthoCol = parseIntStrict(
    "KAITEN_ORTHOPEDICS_COLUMN_TO_EXECUTION_ID",
    process.env.KAITEN_ORTHOPEDICS_COLUMN_TO_EXECUTION_ID,
  );
  const orthoLaneRaw = process.env.KAITEN_ORTHOPEDICS_LANE_ID?.trim();
  const orthoLane = orthoLaneRaw
    ? parseIntStrict("KAITEN_ORTHOPEDICS_LANE_ID", orthoLaneRaw)
    : null;

  const odonBoard = parseIntStrict(
    "KAITEN_ORTHODONTICS_BOARD_ID",
    process.env.KAITEN_ORTHODONTICS_BOARD_ID,
  );
  const odonSpaceId = parseIntStrict(
    "KAITEN_ORTHODONTICS_SPACE_ID",
    process.env.KAITEN_ORTHODONTICS_SPACE_ID,
  );
  const odonCol = parseIntStrict(
    "KAITEN_ORTHODONTICS_COLUMN_TO_EXECUTION_ID",
    process.env.KAITEN_ORTHODONTICS_COLUMN_TO_EXECUTION_ID,
  );
  const odonLaneRaw = process.env.KAITEN_ORTHODONTICS_LANE_ID?.trim();
  const odonLane = odonLaneRaw
    ? parseIntStrict("KAITEN_ORTHODONTICS_LANE_ID", odonLaneRaw)
    : null;

  const orthoReady =
    orthoCol == null
      ? null
      : orthoBoard != null
        ? {
            boardId: orthoBoard,
            spaceId: null,
            columnToExecutionId: orthoCol,
            laneId: orthoLane,
          }
        : orthoSpaceId != null
          ? {
              boardId: null,
              spaceId: orthoSpaceId,
              columnToExecutionId: orthoCol,
              laneId: orthoLane,
            }
          : null;

  const odonReady =
    odonCol == null
      ? null
      : odonBoard != null
        ? {
            boardId: odonBoard,
            spaceId: null,
            columnToExecutionId: odonCol,
            laneId: odonLane,
          }
        : odonSpaceId != null
          ? {
              boardId: null,
              spaceId: odonSpaceId,
              columnToExecutionId: odonCol,
              laneId: odonLane,
            }
          : null;

  const testBoardExplicit = parseIntStrict(
    "KAITEN_TEST_BOARD_ID",
    process.env.KAITEN_TEST_BOARD_ID,
  );
  const testSpaceExplicit = parseIntStrict(
    "KAITEN_TEST_SPACE_ID",
    process.env.KAITEN_TEST_SPACE_ID,
  );
  const testColExplicit = parseIntStrict(
    "KAITEN_TEST_COLUMN_TO_EXECUTION_ID",
    process.env.KAITEN_TEST_COLUMN_TO_EXECUTION_ID,
  );
  const testLaneRaw = process.env.KAITEN_TEST_LANE_ID?.trim();
  const testLaneExplicit = testLaneRaw
    ? parseIntStrict("KAITEN_TEST_LANE_ID", testLaneRaw)
    : null;

  const testBoardCombined =
    testBoardExplicit ?? orthoBoard ?? odonBoard ?? null;
  const testSpaceCombined =
    testSpaceExplicit ??
    (testBoardExplicit == null && testBoardCombined == null
      ? orthoSpaceId ?? odonSpaceId ?? null
      : null);
  const testCol = testColExplicit ?? orthoCol ?? odonCol ?? null;
  const testLaneFallback = orthoLane ?? odonLane;

  const testReady =
    testCol != null && (testBoardCombined != null || testSpaceCombined != null)
      ? {
          boardId: testBoardCombined,
          spaceId:
            testBoardCombined != null ? null : testSpaceCombined ?? null,
          columnToExecutionId: testCol,
          laneId: testLaneExplicit ?? testLaneFallback,
        }
      : null;

  const explicitTestEnv =
    Boolean(process.env.KAITEN_TEST_BOARD_ID?.trim()) ||
    Boolean(process.env.KAITEN_TEST_SPACE_ID?.trim()) ||
    Boolean(process.env.KAITEN_TEST_COLUMN_TO_EXECUTION_ID?.trim()) ||
    Boolean(process.env.KAITEN_TEST_LANE_ID?.trim());

  const boardByLane: Partial<Record<KaitenTrackLane, KaitenBoardTarget>> = {};
  if (orthoReady) boardByLane.ORTHOPEDICS = orthoReady;
  if (odonReady) boardByLane.ORTHODONTICS = odonReady;
  if (testReady) {
    const testDupOrtho =
      !explicitTestEnv &&
      orthoReady != null &&
      boardTargetsEqual(testReady, orthoReady);
    const testDupOdonOnly =
      !explicitTestEnv &&
      orthoReady == null &&
      odonReady != null &&
      boardTargetsEqual(testReady, odonReady);
    if (!testDupOrtho && !testDupOdonOnly) {
      boardByLane.TEST = testReady;
    }
  }

  if (Object.keys(boardByLane).length === 0) {
    return null;
  }

  return {
    apiBase: apiBase.replace(/\/+$/, ""),
    token,
    boardByLane,
  };
}
