/**
 * Настройки производства и чеклист из zip карточки.
 * JSZip — только внутри expand… (dynamic import), не server-only: KanbanApp зовёт из браузера.
 */
import { archiveCardByIdOnBoard, createCard, findCard, generateId, pushActivity } from "./model";
import type { CardFile, KanbanBoard, KanbanCard, ProductionChecklistItem } from "./types";

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const ARCHIVE_3D_FALLBACK_EXTENSIONS = [".stl", ".ply", ".obj"] as const;

function normalizeKey(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function hasKeywordAtBoundary(haystack: string, needle: string): boolean {
  const src = normalizeKey(haystack);
  const key = normalizeKey(needle);
  if (!src || !key) return false;
  let at = src.indexOf(key);
  while (at >= 0) {
    const prev = at > 0 ? src.slice(at - 1, at) : "";
    const next = src.slice(at + key.length, at + key.length + 1);
    const prevOk = !prev || !LETTER_OR_DIGIT.test(prev);
    const nextOk = !next || !LETTER_OR_DIGIT.test(next);
    if (prevOk && nextOk) return true;
    at = src.indexOf(key, at + 1);
  }
  return false;
}

function normalize3dExt(value: string): string {
  const raw = normalizeKey(value).replace(/\s+/g, "");
  if (!raw) return "";
  return raw.startsWith(".") ? raw : `.${raw}`;
}

function normalize3dExtensions(list: string[] | undefined): string[] {
  const ext = (list || []).map(normalize3dExt).filter(Boolean);
  if (!ext.length) return [".stl", ".ply", ".obj"];
  return [...new Set(ext)];
}

function is3dObjectPath(name: string, extensions: string[]): boolean {
  const lower = normalizeKey(name);
  return extensions.some((ext) => lower.endsWith(ext));
}

export function defaultProductionSettings(): NonNullable<KanbanBoard["productionSettings"]> {
  return {
    enabled: true,
    manualRoutingEnabled: false,
    /** Пустая строка — на клиенте подставляется дефолт clickpr. */
    productionMentionTag: "",
    triggerColumnTitle: "Производство",
    parentDoneColumnTitle: "Сборка",
    childTodoColumnTitle: "К исполнению",
    childInProgressColumnTitle: "В работе",
    childDoneColumnTitle: "Готово",
    unmatchedLaneId: "lane_unsorted",
    childAutoArchiveAfterMinutes: 15,
    archive3dExtensions: [".stl", ".ply", ".obj"],
    lanes: [
      { id: "lane_print", name: "Печать", keywords: ["модель", "модели", "моделька", "штампик", "штампики"] },
      { id: "lane_mill", name: "Фрезер", keywords: ["сплинт", "фрезер", "фрезеровка"] },
      { id: "lane_unsorted", name: "Не распределено", keywords: [] },
    ],
  };
}

export function normalizeProductionSettings(
  board: KanbanBoard,
): NonNullable<KanbanBoard["productionSettings"]> {
  const def = defaultProductionSettings();
  const raw = board.productionSettings;
  const lanes = (raw?.lanes || [])
    .map((lane) => ({
      id: String(lane.id || "").trim(),
      name: String(lane.name || "").trim(),
      keywords: (lane.keywords || []).map((x) => String(x || "").trim()).filter(Boolean),
    }))
    .filter((lane) => lane.id && lane.name);
  const merged = { ...def, ...(raw || {}), lanes: lanes.length ? lanes : def.lanes };
  if (typeof merged.productionMentionTag === "string") {
    merged.productionMentionTag = merged.productionMentionTag.trim();
  } else {
    merged.productionMentionTag = "";
  }
  if (!merged.lanes.some((x) => x.id === merged.unmatchedLaneId)) {
    merged.lanes.push({ id: merged.unmatchedLaneId, name: "Не распределено", keywords: [] });
  }
  const rawMinutes = Number(
    (
      raw as Partial<{
        childAutoArchiveAfterMinutes: unknown;
        childAutoArchiveAfterDays: unknown;
      }>
    )?.childAutoArchiveAfterMinutes,
  );
  const rawDays = Number(
    (
      raw as Partial<{
        childAutoArchiveAfterDays: unknown;
      }>
    )?.childAutoArchiveAfterDays,
  );
  const fallbackFromLegacyDays = Number.isFinite(rawDays) ? rawDays * 24 * 60 : NaN;
  const minutesCandidate = Number.isFinite(rawMinutes) ? rawMinutes : fallbackFromLegacyDays;
  merged.childAutoArchiveAfterMinutes = Number.isFinite(minutesCandidate)
    ? Math.max(0, Math.round(minutesCandidate))
    : def.childAutoArchiveAfterMinutes;
  merged.manualRoutingEnabled = merged.manualRoutingEnabled === true;
  merged.archive3dExtensions = normalize3dExtensions(merged.archive3dExtensions);
  board.productionSettings = merged;
  return merged;
}

function resolveLaneForFileName(
  fileName: string,
  settings: NonNullable<KanbanBoard["productionSettings"]>,
): string {
  for (const lane of settings.lanes) {
    if (lane.id === settings.unmatchedLaneId) continue;
    if ((lane.keywords || []).some((kw) => hasKeywordAtBoundary(fileName, kw))) return lane.id;
  }
  return settings.unmatchedLaneId;
}

function looksLikeArchive(name: string, mime?: string): boolean {
  const lower = normalizeKey(name);
  const extArchive =
    lower.endsWith(".zip") ||
    lower.endsWith(".rar") ||
    lower.endsWith(".7z") ||
    lower.endsWith(".tar") ||
    lower.endsWith(".gz") ||
    lower.endsWith(".tgz");
  if (extArchive) return true;
  const m = normalizeKey(String(mime || ""));
  return m.includes("zip") || m.includes("rar") || m.includes("7z") || m.includes("tar");
}

export function isProductionRoutingCandidateFile(
  fileName: string,
  mime: string | undefined,
  configured3dExt: string[] | undefined,
): boolean {
  const extensions = normalize3dExtensions(configured3dExt);
  if (is3dObjectPath(fileName, extensions)) return true;
  return looksLikeArchive(fileName, mime);
}

function cardById(board: KanbanBoard, cardId: string): KanbanCard | null {
  return findCard(board, cardId)?.card ?? null;
}

function colByTitle(board: KanbanBoard, title: string) {
  const want = normalizeKey(title);
  return board.columns.find((col) => normalizeKey(col.title) === want) ?? null;
}

function colByLaneAndStage(
  board: KanbanBoard,
  laneName: string,
  stageTitle: string,
) {
  const target = normalizeKey(`${laneName} · ${stageTitle}`);
  const exact = board.columns.find((col) => normalizeKey(col.title) === target);
  if (exact) return exact;
  return colByTitle(board, stageTitle);
}

function buildInitialChecklist(
  files: CardFile[],
  markAsRedo = false,
): ProductionChecklistItem[] {
  return files.map((f) => ({
    id: generateId("pchk"),
    text: markAsRedo ? `Переделать: ${f.name}` : f.name,
    completed: false,
    completedAt: null,
    sourceFileId: f.id,
    sourceFileName: f.name,
    fromArchive: false,
    reworkCount: 0,
    reworkEvents: [],
  }));
}

function cloneProductionChecklist(
  list: ProductionChecklistItem[] | undefined,
): ProductionChecklistItem[] {
  return (list || []).map((item) => ({ ...item }));
}

function upsertParentChecklistSnapshot(
  parent: KanbanCard,
  child: KanbanCard,
  columnTitle: string,
): void {
  const now = new Date().toISOString();
  const snapshots = parent.productionChecklistSnapshots || [];
  const snapshot = {
    childCardId: child.id,
    childTitle: child.title,
    laneId: child.productionLaneId,
    columnTitle,
    updatedAt: now,
    checklist: cloneProductionChecklist(child.productionChecklist),
  };
  const idx = snapshots.findIndex((row) => row.childCardId === child.id);
  if (idx >= 0) {
    snapshots[idx] = snapshot;
  } else {
    snapshots.push(snapshot);
  }
  parent.productionChecklistSnapshots = snapshots;
  parent.updatedAt = now;
}

export function syncParentProductionChecklistSnapshot(
  board: KanbanBoard,
  childCardId: string,
): void {
  const childLoc = findCard(board, childCardId);
  if (!childLoc) return;
  const child = childLoc.card;
  if (!child.parentCardId) return;
  const parent = cardById(board, child.parentCardId);
  if (!parent) return;
  upsertParentChecklistSnapshot(parent, child, childLoc.col.title);
}

type ChildCardLocation = {
  card: KanbanCard;
  columnTitle: string;
};

function buildChildLookupById(boards: KanbanBoard[]): Map<string, ChildCardLocation> {
  const index = new Map<string, ChildCardLocation>();
  for (const board of boards) {
    for (const col of board.columns) {
      for (const card of col.cards) {
        index.set(card.id, { card, columnTitle: col.title });
      }
    }
  }
  return index;
}

function isSameChecklistSnapshot(
  left: ProductionChecklistItem[] | undefined,
  right: ProductionChecklistItem[] | undefined,
): boolean {
  const a = left || [];
  const b = right || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const aa = a[i];
    const bb = b[i];
    if (!aa || !bb) return false;
    if (
      aa.id !== bb.id ||
      aa.text !== bb.text ||
      aa.completed !== bb.completed ||
      (aa.completedAt || null) !== (bb.completedAt || null) ||
      (aa.sourceFileId || null) !== (bb.sourceFileId || null) ||
      (aa.sourceFileName || null) !== (bb.sourceFileName || null) ||
      aa.fromArchive !== bb.fromArchive ||
      (aa.archiveEntryName || null) !== (bb.archiveEntryName || null) ||
      (aa.reworkCount || 0) !== (bb.reworkCount || 0) ||
      JSON.stringify(aa.reworkEvents || []) !== JSON.stringify(bb.reworkEvents || [])
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Синхронизирует read-only чеклисты родителя с живыми дочерними карточками
 * по всем доскам (нужно, когда parent/child находятся в разных board).
 */
export function syncProductionChecklistSnapshotsAcrossBoards(boards: KanbanBoard[]): number {
  if (!boards.length) return 0;
  const childLookup = buildChildLookupById(boards);
  const now = new Date().toISOString();
  let touched = 0;
  for (const board of boards) {
    for (const col of board.columns) {
      for (const parent of col.cards) {
        if (parent.parentCardId) continue;
        const childIds = parent.childCardIds || [];
        const existing = parent.productionChecklistSnapshots || [];
        if (!childIds.length && !existing.length) continue;
        const existingById = new Map(existing.map((row) => [row.childCardId, row]));
        const liveIds = new Set<string>();
        const nextSnapshots: typeof existing = [];
        for (const childId of childIds) {
          const loc = childLookup.get(childId);
          if (!loc || loc.card.parentCardId !== parent.id) continue;
          const liveChecklist = cloneProductionChecklist(loc.card.productionChecklist);
          const prev = existingById.get(childId);
          const changed =
            !prev ||
            prev.childTitle !== loc.card.title ||
            (prev.laneId || "") !== (loc.card.productionLaneId || "") ||
            (prev.columnTitle || "") !== loc.columnTitle ||
            !isSameChecklistSnapshot(prev.checklist, liveChecklist);
          nextSnapshots.push({
            childCardId: loc.card.id,
            childTitle: loc.card.title,
            laneId: loc.card.productionLaneId,
            columnTitle: loc.columnTitle,
            updatedAt: changed ? now : (prev?.updatedAt ?? now),
            checklist: liveChecklist,
          });
          liveIds.add(childId);
          if (changed) touched += 1;
        }
        for (const row of existing) {
          if (liveIds.has(row.childCardId)) continue;
          nextSnapshots.push(row);
        }
        const sizeChanged = nextSnapshots.length !== existing.length;
        const orderChanged = !sizeChanged
          ? nextSnapshots.some((row, idx) => row.childCardId !== existing[idx]?.childCardId)
          : true;
        const contentChanged = !sizeChanged
          ? nextSnapshots.some((row, idx) => {
              const prev = existing[idx];
              if (!prev) return true;
              return (
                row.childTitle !== prev.childTitle ||
                (row.laneId || "") !== (prev.laneId || "") ||
                (row.columnTitle || "") !== (prev.columnTitle || "") ||
                (row.updatedAt || "") !== (prev.updatedAt || "") ||
                !isSameChecklistSnapshot(row.checklist, prev.checklist)
              );
            })
          : true;
        if (sizeChanged || orderChanged || contentChanged) {
          parent.productionChecklistSnapshots = nextSnapshots;
          parent.updatedAt = now;
        }
      }
    }
  }
  return touched;
}

function upsertChildCardForLane(input: {
  board: KanbanBoard;
  parent: KanbanCard;
  laneId: string;
  laneName: string;
  files: CardFile[];
  settings: NonNullable<KanbanBoard["productionSettings"]>;
  markAsRedo?: boolean;
  activityActorLabel?: string;
}): { id: string; created: boolean } {
  const {
    board,
    parent,
    laneId,
    laneName,
    files,
    settings,
    markAsRedo = false,
    activityActorLabel,
  } = input;
  const existing = board.columns
    .flatMap((col) => col.cards)
    .find((card) => card.parentCardId === parent.id && card.productionLaneId === laneId);
  if (existing) {
    existing.files = files.map((f) => ({ ...f }));
    existing.productionChecklist = buildInitialChecklist(files, markAsRedo);
    existing.updatedAt = new Date().toISOString();
    if (markAsRedo) {
      const todoCol = colByLaneAndStage(board, laneName, settings.childTodoColumnTitle);
      const currentCol = board.columns.find((col) =>
        col.cards.some((card) => card.id === existing.id),
      );
      if (todoCol && currentCol && currentCol.id !== todoCol.id) {
        currentCol.cards = currentCol.cards.filter((card) => card.id !== existing.id);
        todoCol.cards.unshift(existing);
        existing.lastMovedAt = new Date().toISOString();
      }
      existing.productionReadyAt = null;
    }
    return { id: existing.id, created: false };
  }
  const todoCol = colByLaneAndStage(board, laneName, settings.childTodoColumnTitle);
  if (!todoCol) return { id: "", created: false };
  const child = createCard({
    title: `${parent.title} · ${laneName}`,
    description: markAsRedo
      ? `Переделка для направления «${laneName}».`
      : `Производственная карточка для направления «${laneName}».`,
    createdByUserId: parent.createdByUserId,
    files: files.map((f) => ({ ...f })),
    productionChecklist: buildInitialChecklist(files, markAsRedo),
    parentCardId: parent.id,
    productionLaneId: laneId,
    childCardIds: [],
    productionReadyAt: null,
  });
  todoCol.cards.unshift(child);
  pushActivity(
    child,
    `Создана дочерняя карточка производства (${laneName})`,
    board.users[0]?.id,
    board,
    activityActorLabel,
  );
  return { id: child.id, created: true };
}

export type SyncProductionChildrenResult = {
  childIds: string[];
  newlyCreated: Array<{ childId: string; laneName: string }>;
};

export function syncProductionChildrenForParent(
  board: KanbanBoard,
  parentCardId: string,
  activityActorLabel?: string,
  parentCard?: KanbanCard,
): SyncProductionChildrenResult {
  const settings = normalizeProductionSettings(board);
  if (!settings.enabled) return { childIds: [], newlyCreated: [] };
  const parent = parentCard ?? cardById(board, parentCardId);
  if (!parent || parent.parentCardId) return { childIds: [], newlyCreated: [] };
  const redoFiles = (parent.files || []).filter((f) => f.productionRedo === true);
  const markAsRedo = redoFiles.length > 0;
  const sourceFiles = markAsRedo ? redoFiles : parent.files || [];
  const grouped = new Map<string, CardFile[]>();
  for (const f of sourceFiles) {
    const manualLaneId = String(f.productionLaneId || "").trim();
    const manualLaneValid =
      manualLaneId && settings.lanes.some((lane) => lane.id === manualLaneId);
    if (settings.manualRoutingEnabled === true) {
      // В режиме "вручную" ключевые слова не участвуют: только явный выбор дорожки.
      if (f.productionSkip === true) continue;
      if (!manualLaneValid) continue;
      const list = grouped.get(manualLaneId) || [];
      list.push(f);
      grouped.set(manualLaneId, list);
      continue;
    }
    if (f.productionSkip === true) continue;
    const laneId = manualLaneValid
      ? manualLaneId
      : resolveLaneForFileName(f.name, settings);
    const list = grouped.get(laneId) || [];
    list.push(f);
    grouped.set(laneId, list);
  }
  if (grouped.size === 0) return { childIds: [], newlyCreated: [] };
  const hasExplicitLane = [...grouped.keys()].some(
    (laneId) => laneId !== settings.unmatchedLaneId,
  );
  if (hasExplicitLane) {
    grouped.delete(settings.unmatchedLaneId);
  }
  const childIds: string[] = [];
  const newlyCreated: Array<{ childId: string; laneName: string }> = [];
  for (const [laneId, files] of grouped.entries()) {
    const laneName = settings.lanes.find((x) => x.id === laneId)?.name ?? laneId;
    const up = upsertChildCardForLane({
      board,
      parent,
      laneId,
      laneName,
      files,
      settings,
      markAsRedo,
      activityActorLabel,
    });
    if (up.id) {
      childIds.push(up.id);
      if (up.created) newlyCreated.push({ childId: up.id, laneName });
    }
  }
  if (childIds.length) {
    parent.childCardIds = childIds;
    parent.productionReadyAt = null;
    if (markAsRedo) {
      const redoIds = new Set(redoFiles.map((f) => f.id));
      parent.files = (parent.files || []).map((f) =>
        redoIds.has(f.id) ? { ...f, productionRedo: false } : f,
      );
    }
    const childIdSet = new Set(childIds);
    parent.productionChecklistSnapshots = (parent.productionChecklistSnapshots || []).filter((row) =>
      childIdSet.has(row.childCardId),
    );
    for (const childId of childIds) {
      syncParentProductionChecklistSnapshot(board, childId);
    }
  }
  return { childIds, newlyCreated };
}

async function readCardFileBuffer(file: CardFile): Promise<ArrayBuffer> {
  const src = String(file.dataUrl || "");
  if (src.startsWith("data:")) {
    const res = await fetch(src);
    return await res.arrayBuffer();
  }
  const res = await fetch(src, { credentials: "include" });
  if (!res.ok) throw new Error("file fetch failed");
  return await res.arrayBuffer();
}

export async function expandProductionChecklistFromArchives(
  board: KanbanBoard,
  childCardId: string,
): Promise<void> {
  const settings = normalizeProductionSettings(board);
  const child = cardById(board, childCardId);
  if (!child) return;
  const redoBySourceFileId = new Set(
    (child.productionChecklist || [])
      .filter(
        (row) =>
          String(row.text || "").trim().toLowerCase().startsWith("переделать:") &&
          String(row.sourceFileId || "").trim(),
      )
      .map((row) => String(row.sourceFileId || "").trim()),
  );
  const next: ProductionChecklistItem[] = [];
  for (const f of child.files || []) {
    const markAsRedo = redoBySourceFileId.has(String(f.id || "").trim());
    const withRedoPrefix = (text: string) => (markAsRedo ? `Переделать: ${text}` : text);
    const lower = normalizeKey(f.name);
    const looksZip = lower.endsWith(".zip") || (f.mime || "").toLowerCase().includes("zip");
    if (!looksZip) {
      next.push({
        id: generateId("pchk"),
        text: withRedoPrefix(f.name),
        completed: false,
        completedAt: null,
        sourceFileId: f.id,
        sourceFileName: f.name,
        fromArchive: false,
        reworkCount: 0,
        reworkEvents: [],
      });
      continue;
    }
    try {
      const buf = await readCardFileBuffer(f);
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buf);
      let names = Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .map((entry) => entry.name)
        .filter((name) => Boolean(name) && is3dObjectPath(name, settings.archive3dExtensions));
      if (names.length === 0) {
        // Если пользователь случайно сузил список расширений в настройках,
        // всё равно подхватываем базовые 3D-форматы.
        names = Object.values(zip.files)
          .filter((entry) => !entry.dir)
          .map((entry) => entry.name)
          .filter((name) => Boolean(name) && is3dObjectPath(name, [...ARCHIVE_3D_FALLBACK_EXTENSIONS]));
      }
      if (names.length === 0) continue;
      for (const name of names) {
        next.push({
          id: generateId("pchk"),
          text: withRedoPrefix(name),
          completed: false,
          completedAt: null,
          sourceFileId: f.id,
          sourceFileName: f.name,
          fromArchive: true,
          archiveEntryName: name,
          reworkCount: 0,
          reworkEvents: [],
        });
      }
    } catch {
      // Для архивов не подставляем имя архива как пункт чеклиста:
      // показываем только реальные 3D-файлы изнутри ZIP.
      continue;
    }
  }
  child.productionChecklist = next;
  child.updatedAt = new Date().toISOString();
  syncParentProductionChecklistSnapshot(board, childCardId);
}

export function isProductionChildDone(board: KanbanBoard, childCardId: string): boolean {
  const settings = normalizeProductionSettings(board);
  const doneRaw = normalizeKey(settings.childDoneColumnTitle);
  for (const col of board.columns) {
    if (!col.cards.some((c) => c.id === childCardId)) continue;
    const colRaw = normalizeKey(col.title);
    if (colRaw === doneRaw) return true;
    if (colRaw.endsWith(`· ${doneRaw}`)) return true;
  }
  return false;
}

export function markProductionChildReadyState(board: KanbanBoard, cardId: string): void {
  const card = cardById(board, cardId);
  if (!card || !card.parentCardId) return;
  card.productionReadyAt = isProductionChildDone(board, cardId) ? new Date().toISOString() : null;
  syncParentProductionChecklistSnapshot(board, cardId);
}

export function parentCanMoveToAssembly(board: KanbanBoard, parentCardId: string): boolean {
  const parent = cardById(board, parentCardId);
  if (!parent) return false;
  const ids = parent.childCardIds || [];
  if (!ids.length) return false;
  return ids.every((id) => isProductionChildDone(board, id));
}

export function moveParentToAssemblyIfReady(
  board: KanbanBoard,
  parentCardId: string,
  activityActorLabel?: string,
): boolean {
  const settings = normalizeProductionSettings(board);
  if (!parentCanMoveToAssembly(board, parentCardId)) return false;
  const parentLoc = findCard(board, parentCardId);
  const assembly = colByTitle(board, settings.parentDoneColumnTitle);
  if (!parentLoc || !assembly) return false;
  if (parentLoc.col.id === assembly.id) return false;
  parentLoc.col.cards = parentLoc.col.cards.filter((c) => c.id !== parentLoc.card.id);
  assembly.cards.unshift(parentLoc.card);
  parentLoc.card.lastMovedAt = new Date().toISOString();
  pushActivity(
    parentLoc.card,
    `Перемещена в «${assembly.title}»`,
    board.users[0]?.id,
    board,
    activityActorLabel,
  );
  return true;
}

export function warnIfChildMovedToDoneWithIncompleteChecklist(
  board: KanbanBoard,
  cardId: string,
): boolean {
  const card = cardById(board, cardId);
  if (!card || !card.parentCardId) return false;
  const list = card.productionChecklist || [];
  if (!list.length) return false;
  return list.some((x) => !x.completed);
}

export function autoArchiveReadyProductionChildren(board: KanbanBoard): number {
  const settings = normalizeProductionSettings(board);
  const minutes = settings.childAutoArchiveAfterMinutes;
  let count = 0;
  const now = Date.now();
  for (const col of board.columns) {
    for (const card of [...col.cards]) {
      if (!card.parentCardId || !card.productionReadyAt) continue;
      const readyAt = new Date(card.productionReadyAt).getTime();
      if (!Number.isFinite(readyAt)) continue;
      const ageMinutes = (now - readyAt) / (1000 * 60);
      if (ageMinutes < minutes) continue;
      const parent = cardById(board, card.parentCardId);
      if (parent) {
        upsertParentChecklistSnapshot(parent, card, col.title);
      }
      if (archiveCardByIdOnBoard(board, card.id, "auto")) {
        if (parent) {
          parent.childCardIds = (parent.childCardIds || []).filter((id) => id !== card.id);
        }
        count += 1;
      }
    }
  }
  return count;
}
