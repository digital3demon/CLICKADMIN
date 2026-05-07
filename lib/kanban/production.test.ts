import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createCard } from "./model";
import {
  autoArchiveReadyProductionChildren,
  defaultProductionSettings,
  expandProductionChecklistFromArchives,
  moveParentToAssemblyIfReady,
  parentCanMoveToAssembly,
  syncProductionChildrenForParent,
} from "./production";
import type { KanbanBoard } from "./types";

function makeBoard(): KanbanBoard {
  return {
    id: "b1",
    title: "Test",
    columns: [
      { id: "c1", title: "Согласование", cards: [] },
      { id: "c2", title: "Производство", cards: [] },
      { id: "c3", title: "К исполнению", cards: [] },
      { id: "c4", title: "В работе", cards: [] },
      { id: "c5", title: "Готово", cards: [] },
      { id: "c6", title: "Сборка", cards: [] },
    ],
    users: [],
    cardTypes: [],
    productionSettings: defaultProductionSettings(),
  };
}

describe("kanban production routing", () => {
  it("routes files with cyrillic boundaries into print/mill", () => {
    const board = makeBoard();
    const parent = createCard({
      id: "p1",
      title: "Parent",
      files: [
        {
          id: "f1",
          name: "2602-089-Быстрова-Садовникова-модель-2.zip",
          mime: "application/zip",
          size: 10,
          dataUrl: "data:application/zip;base64,AA==",
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
        {
          id: "f2",
          name: "2602-089-Быстрова-Садовникова-сплинт-1.zip",
          mime: "application/zip",
          size: 10,
          dataUrl: "data:application/zip;base64,AA==",
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
        {
          id: "f3",
          name: "ТекстДоМодельТекстПосле.stl",
          mime: "application/octet-stream",
          size: 10,
          dataUrl: "data:application/octet-stream;base64,AA==",
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
      ],
    });
    board.columns[1]?.cards.push(parent);
    const syncRes = syncProductionChildrenForParent(board, parent.id);
    expect(syncRes.childIds.length).toBe(2);
    const childCards = board.columns[2]?.cards ?? [];
    expect(childCards.some((c) => c.productionLaneId === "lane_print")).toBe(true);
    expect(childCards.some((c) => c.productionLaneId === "lane_mill")).toBe(true);
    expect(childCards.some((c) => c.productionLaneId === "lane_unsorted")).toBe(false);
  });

  it("puts unmatched files into fallback lane", () => {
    const board = makeBoard();
    const parent = createCard({
      id: "p2",
      title: "Parent 2",
      files: [
        {
          id: "f4",
          name: "2602-089-пример-другое.stl",
          mime: "application/octet-stream",
          size: 10,
          dataUrl: "data:application/octet-stream;base64,AA==",
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
      ],
    });
    board.columns[1]?.cards.push(parent);
    syncProductionChildrenForParent(board, parent.id);
    const fallback = (board.columns[2]?.cards ?? []).find(
      (c) => c.productionLaneId === board.productionSettings?.unmatchedLaneId,
    );
    expect(Boolean(fallback)).toBe(true);
  });

  it("rework cycle resets done child and rebuilds checklist", () => {
    const board = makeBoard();
    const parent = createCard({
      id: "p-rework",
      title: "Parent rework",
      files: [
        {
          id: "f-rework",
          name: "2602-089-Быстрова-Садовникова-сплинт-1.stl",
          mime: "application/octet-stream",
          size: 10,
          dataUrl: "data:application/octet-stream;base64,AA==",
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
          productionRedo: true,
        },
      ],
    });
    const child = createCard({
      id: "ch-rework",
      title: "Child old",
      parentCardId: parent.id,
      productionLaneId: "lane_mill",
      productionChecklist: [
        {
          id: "chk-old",
          text: "old item",
          completed: true,
          sourceFileId: "f-rework",
          sourceFileName: "2602-089-Быстрова-Садовникова-сплинт-1.stl",
          fromArchive: false,
        },
      ],
      productionReadyAt: new Date().toISOString(),
    });
    board.columns[1]?.cards.push(parent);
    board.columns[4]?.cards.push(child); // "Готово"

    const res = syncProductionChildrenForParent(board, parent.id);
    expect(res.childIds).toContain(child.id);
    expect(board.columns[2]?.cards.some((c) => c.id === child.id)).toBe(true); // moved to todo
    expect(board.columns[4]?.cards.some((c) => c.id === child.id)).toBe(false);
    const updated = board.columns.flatMap((c) => c.cards).find((c) => c.id === child.id)!;
    expect(updated.productionChecklist?.[0]?.text.startsWith("Переделать: ")).toBe(true);
    expect((parent.files || []).every((f) => f.productionRedo !== true)).toBe(true);
  });
});

describe("kanban production checklist from archives", () => {
  it("expands zip entries into production checklist", async () => {
    const board = makeBoard();
    const zip = new JSZip();
    zip.file("model-a.stl", "demo");
    zip.file("folder/model-b.stl", "demo");
    zip.file("readme.txt", "ignore");
    zip.file("nested/notes.md", "ignore");
    zip.file("scan.PLY", "demo");
    zip.file("mesh.obj", "demo");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const dataUrl = `data:application/zip;base64,${Buffer.from(buffer).toString("base64")}`;
    const child = createCard({
      id: "c-child",
      title: "Child",
      parentCardId: "p9",
      files: [
        {
          id: "zip1",
          name: "архив-модель.zip",
          mime: "application/zip",
          size: buffer.byteLength,
          dataUrl,
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
      ],
    });
    board.columns[2]?.cards.push(child);
    await expandProductionChecklistFromArchives(board, child.id);
    const list = child.productionChecklist || [];
    expect(list.length).toBe(4);
    expect(list.every((x) => x.fromArchive)).toBe(true);
    expect(list.some((x) => x.text.endsWith(".txt"))).toBe(false);
    expect(list.some((x) => x.text.endsWith(".md"))).toBe(false);
  });

  it("uses configurable 3d extensions from board settings", async () => {
    const board = makeBoard();
    board.productionSettings = {
      ...defaultProductionSettings(),
      archive3dExtensions: [".mesh"],
    };
    const zip = new JSZip();
    zip.file("a.stl", "ignore");
    zip.file("b.mesh", "ok");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const dataUrl = `data:application/zip;base64,${Buffer.from(buffer).toString("base64")}`;
    const child = createCard({
      id: "c-child-2",
      title: "Child 2",
      parentCardId: "p10",
      files: [
        {
          id: "zip2",
          name: "архив-custom.zip",
          mime: "application/zip",
          size: buffer.byteLength,
          dataUrl,
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
      ],
    });
    board.columns[2]?.cards.push(child);
    await expandProductionChecklistFromArchives(board, child.id);
    const list = child.productionChecklist || [];
    expect(list.length).toBe(1);
    expect(list[0]?.text).toBe("b.mesh");
  });

  it("does not fallback to archive filename when no 3d entries found", async () => {
    const board = makeBoard();
    const zip = new JSZip();
    zip.file("Быстрова_Е.П.-Садовникова_Г.Г.constructionInfo", "meta");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const dataUrl = `data:application/zip;base64,${Buffer.from(buffer).toString("base64")}`;
    const child = createCard({
      id: "c-child-3",
      title: "Child 3",
      parentCardId: "p11",
      files: [
        {
          id: "zip3",
          name: "2602-089-Быстрова-Садовникова-сплинт-1.zip",
          mime: "application/zip",
          size: buffer.byteLength,
          dataUrl,
          addedAt: new Date().toISOString(),
          addedByUserId: "u1",
        },
      ],
    });
    board.columns[2]?.cards.push(child);
    await expandProductionChecklistFromArchives(board, child.id);
    const list = child.productionChecklist || [];
    expect(list.length).toBe(0);
  });
});

describe("kanban parent move after children done", () => {
  it("moves parent to assembly only when all child cards are done", () => {
    const board = makeBoard();
    const parent = createCard({ id: "p3", title: "Parent 3", childCardIds: ["ch1", "ch2"] });
    const ch1 = createCard({ id: "ch1", title: "Child 1", parentCardId: "p3" });
    const ch2 = createCard({ id: "ch2", title: "Child 2", parentCardId: "p3" });
    board.columns[1]?.cards.push(parent);
    board.columns[4]?.cards.push(ch1);
    expect(parentCanMoveToAssembly(board, parent.id)).toBe(false);
    board.columns[4]?.cards.push(ch2);
    expect(parentCanMoveToAssembly(board, parent.id)).toBe(true);
    const moved = moveParentToAssemblyIfReady(board, parent.id);
    expect(moved).toBe(true);
    expect(board.columns[5]?.cards.some((c) => c.id === parent.id)).toBe(true);
  });

  it("moves parent from lane-prefixed production column", () => {
    const board = makeBoard();
    board.columns[1]!.title = "Печать · Производство";
    const parent = createCard({ id: "p4", title: "Parent 4", childCardIds: ["ch3"] });
    const child = createCard({ id: "ch3", title: "Child 3", parentCardId: "p4" });
    board.columns[1]?.cards.push(parent);
    board.columns[4]?.cards.push(child);
    const moved = moveParentToAssemblyIfReady(board, parent.id);
    expect(moved).toBe(true);
    expect(board.columns[5]?.cards.some((c) => c.id === parent.id)).toBe(true);
    expect(board.columns[1]?.cards.some((c) => c.id === parent.id)).toBe(false);
  });
});

describe("kanban production auto-archive delay", () => {
  it("archives done child after configured minutes and keeps checklist snapshot in parent", () => {
    const board = makeBoard();
    const parent = createCard({
      id: "p-archive",
      title: "Parent archive",
      childCardIds: ["ch-archive"],
    });
    const child = createCard({
      id: "ch-archive",
      title: "Child archive",
      parentCardId: parent.id,
      productionLaneId: "lane_print",
      productionReadyAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      productionChecklist: [
        {
          id: "chk-archive",
          text: "model.stl",
          completed: true,
          completedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          sourceFileId: "f-archive",
          sourceFileName: "model.stl",
          fromArchive: false,
        },
      ],
    });
    board.productionSettings = {
      ...defaultProductionSettings(),
      childAutoArchiveAfterMinutes: 15,
    };
    board.columns[4]?.cards.push(child); // Готово
    board.columns[1]?.cards.push(parent);

    const count = autoArchiveReadyProductionChildren(board);

    expect(count).toBe(1);
    expect(board.columns[4]?.cards.some((c) => c.id === child.id)).toBe(false);
    expect((parent.childCardIds || []).includes(child.id)).toBe(false);
    expect((parent.productionChecklistSnapshots || []).length).toBe(1);
    expect(parent.productionChecklistSnapshots?.[0]?.checklist?.[0]?.text).toBe("model.stl");
  });
});
