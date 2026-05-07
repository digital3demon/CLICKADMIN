import JSZip from "jszip";
import { archiveCardByIdOnBoard, createCard, findCard, generateId, pushActivity } from "./model";
import type { CardFile, KanbanBoard, KanbanCard, ProductionChecklistItem } from "./types";

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

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
    triggerColumnTitle: "Производство",
    parentDoneColumnTitle: "Сборка",
    childTodoColumnTitle: "К исполнению",
    childInProgressColumnTitle: "В работе",
    childDoneColumnTitle: "Готово",
    unmatchedLaneId: "lane_unsorted",
    childAutoArchiveAfterDays: 0,
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
  if (!merged.lanes.some((x) => x.id === merged.unmatchedLaneId)) {
    merged.lanes.push({ id: merged.unmatchedLaneId, name: "Не распределено", keywords: [] });
  }
  const days = Number(merged.childAutoArchiveAfterDays);
  merged.childAutoArchiveAfterDays = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 0;
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

function buildInitialChecklist(files: CardFile[]): ProductionChecklistItem[] {
  return files.map((f) => ({
    id: generateId("pchk"),
    text: f.name,
    completed: false,
    sourceFileId: f.id,
    sourceFileName: f.name,
    fromArchive: false,
  }));
}

function upsertChildCardForLane(input: {
  board: KanbanBoard;
  parent: KanbanCard;
  laneId: string;
  laneName: string;
  files: CardFile[];
  settings: NonNullable<KanbanBoard["productionSettings"]>;
  activityActorLabel?: string;
}): string {
  const { board, parent, laneId, laneName, files, settings, activityActorLabel } = input;
  const existing = board.columns
    .flatMap((col) => col.cards)
    .find((card) => card.parentCardId === parent.id && card.productionLaneId === laneId);
  if (existing) {
    existing.files = files.map((f) => ({ ...f }));
    existing.productionChecklist = buildInitialChecklist(files);
    existing.updatedAt = new Date().toISOString();
    return existing.id;
  }
  const todoCol = colByLaneAndStage(board, laneName, settings.childTodoColumnTitle);
  if (!todoCol) return "";
  const child = createCard({
    title: `${parent.title} · ${laneName}`,
    description: `Производственная карточка для направления «${laneName}».`,
    createdByUserId: parent.createdByUserId,
    files: files.map((f) => ({ ...f })),
    productionChecklist: buildInitialChecklist(files),
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
  return child.id;
}

export function syncProductionChildrenForParent(
  board: KanbanBoard,
  parentCardId: string,
  activityActorLabel?: string,
  parentCard?: KanbanCard,
): string[] {
  const settings = normalizeProductionSettings(board);
  if (!settings.enabled) return [];
  const parent = parentCard ?? cardById(board, parentCardId);
  if (!parent || parent.parentCardId) return [];
  const grouped = new Map<string, CardFile[]>();
  for (const f of parent.files || []) {
    const laneId = resolveLaneForFileName(f.name, settings);
    const list = grouped.get(laneId) || [];
    list.push(f);
    grouped.set(laneId, list);
  }
  if (grouped.size === 0) return [];
  const childIds: string[] = [];
  for (const [laneId, files] of grouped.entries()) {
    const laneName = settings.lanes.find((x) => x.id === laneId)?.name ?? laneId;
    const childId = upsertChildCardForLane({
      board,
      parent,
      laneId,
      laneName,
      files,
      settings,
      activityActorLabel,
    });
    if (childId) childIds.push(childId);
  }
  if (childIds.length) {
    parent.childCardIds = childIds;
    parent.productionReadyAt = null;
  }
  return childIds;
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
  const next: ProductionChecklistItem[] = [];
  for (const f of child.files || []) {
    const lower = normalizeKey(f.name);
    const looksZip = lower.endsWith(".zip") || (f.mime || "").toLowerCase().includes("zip");
    if (!looksZip) {
      next.push({
        id: generateId("pchk"),
        text: f.name,
        completed: false,
        sourceFileId: f.id,
        sourceFileName: f.name,
        fromArchive: false,
      });
      continue;
    }
    try {
      const buf = await readCardFileBuffer(f);
      const zip = await JSZip.loadAsync(buf);
      const names = Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .map((entry) => entry.name)
        .filter((name) => Boolean(name) && is3dObjectPath(name, settings.archive3dExtensions));
      if (names.length === 0) throw new Error("empty");
      for (const name of names) {
        next.push({
          id: generateId("pchk"),
          text: name,
          completed: false,
          sourceFileId: f.id,
          sourceFileName: f.name,
          fromArchive: true,
          archiveEntryName: name,
        });
      }
    } catch {
      next.push({
        id: generateId("pchk"),
        text: f.name,
        completed: false,
        sourceFileId: f.id,
        sourceFileName: f.name,
        fromArchive: false,
      });
    }
  }
  child.productionChecklist = next;
  child.updatedAt = new Date().toISOString();
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
  const parent = cardById(board, parentCardId);
  const assembly = colByTitle(board, settings.parentDoneColumnTitle);
  const production = colByTitle(board, settings.triggerColumnTitle);
  if (!parent || !assembly || !production) return false;
  if (assembly.cards.some((c) => c.id === parent.id)) return false;
  production.cards = production.cards.filter((c) => c.id !== parent.id);
  assembly.cards.unshift(parent);
  parent.lastMovedAt = new Date().toISOString();
  pushActivity(parent, `Перемещена в «${assembly.title}»`, board.users[0]?.id, board, activityActorLabel);
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
  const days = settings.childAutoArchiveAfterDays;
  let count = 0;
  const now = Date.now();
  for (const col of board.columns) {
    for (const card of [...col.cards]) {
      if (!card.parentCardId || !card.productionReadyAt) continue;
      const readyAt = new Date(card.productionReadyAt).getTime();
      if (!Number.isFinite(readyAt)) continue;
      const ageDays = (now - readyAt) / (1000 * 60 * 60 * 24);
      if (ageDays < days) continue;
      if (archiveCardByIdOnBoard(board, card.id, "auto")) count += 1;
    }
  }
  return count;
}
