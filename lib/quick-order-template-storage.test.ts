import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/client-storage-bucket", () => ({
  readClientStorageBucket: () => "test-bucket",
}));

const writeClientState = vi.fn().mockResolvedValue(true);
const deleteClientState = vi.fn().mockResolvedValue(true);
const readClientState = vi.fn().mockResolvedValue(null);

vi.mock("@/lib/client-state-client", () => ({
  writeClientState: (...args: unknown[]) => writeClientState(...args),
  deleteClientState: (...args: unknown[]) => deleteClientState(...args),
  readClientState: (...args: unknown[]) => readClientState(...args),
}));

import {
  __resetQuickOrderTemplateStorageForTests,
  loadQuickOrderTemplate,
  loadQuickOrderTemplateFromDb,
  quickOrderTemplateAsNewOrderDefaults,
  saveQuickOrderTemplate,
} from "./quick-order-template-storage";
import {
  QUICK_ORDER_VERSION,
  mergeQuickOrderFromSnapshot,
} from "@/components/orders/new-order-form/quick-order-types";

describe("saveQuickOrderTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetQuickOrderTemplateStorageForTests();
  });

  it("writes tiles when template is non-empty", () => {
    saveQuickOrderTemplate({
      v: QUICK_ORDER_VERSION,
      tiles: [
        {
          id: "t1",
          title: "Каппа",
          accentColor: "#0ea5e9",
          basePriceListItemId: null,
          basePriceSummary: null,
          baseActive: false,
          isBlockTile: false,
          blockOnSave: false,
          blockReason: "",
          options: [],
        },
      ],
      continueWork: null,
    });
    expect(writeClientState).toHaveBeenCalledTimes(1);
    expect(deleteClientState).not.toHaveBeenCalled();
    expect(loadQuickOrderTemplate()?.tiles).toHaveLength(1);
  });

  it("deletes stored template when all tiles removed", () => {
    saveQuickOrderTemplate({
      v: QUICK_ORDER_VERSION,
      tiles: [
        {
          id: "t1",
          title: "Каппа",
          accentColor: "#0ea5e9",
          basePriceListItemId: null,
          basePriceSummary: null,
          baseActive: false,
          isBlockTile: false,
          blockOnSave: false,
          blockReason: "",
          options: [],
        },
      ],
      continueWork: null,
    });
    writeClientState.mockClear();

    saveQuickOrderTemplate({
      v: QUICK_ORDER_VERSION,
      tiles: [],
      continueWork: null,
    });

    expect(deleteClientState).toHaveBeenCalledTimes(1);
    expect(writeClientState).not.toHaveBeenCalled();
    expect(loadQuickOrderTemplate()).toBeNull();
  });

  it("does not resurrect deleted tiles from empty storage payload", async () => {
    readClientState.mockResolvedValueOnce({
      v: QUICK_ORDER_VERSION,
      tiles: [],
      continueWork: null,
    });
    const tpl = await loadQuickOrderTemplateFromDb();
    expect(tpl).toBeNull();
    expect(loadQuickOrderTemplate()).toBeNull();
  });

  it("ignores stale DB read after concurrent delete", async () => {
    let resolveRead: (v: unknown) => void = () => {};
    readClientState.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    const loadPromise = loadQuickOrderTemplateFromDb();
    saveQuickOrderTemplate({
      v: QUICK_ORDER_VERSION,
      tiles: [],
      continueWork: null,
    });
    resolveRead({
      v: QUICK_ORDER_VERSION,
      tiles: [
        {
          id: "stale",
          title: "Старая",
          accentColor: "#0ea5e9",
          basePriceListItemId: null,
          basePriceSummary: null,
          baseActive: false,
          isBlockTile: false,
          blockOnSave: false,
          blockReason: "",
          options: [],
        },
      ],
      continueWork: null,
    });

    await expect(loadPromise).resolves.toBeNull();
    expect(loadQuickOrderTemplate()).toBeNull();
  });
});

describe("quickOrderTemplateAsNewOrderDefaults", () => {
  it("keeps block-tile reason and turns block on for new order", () => {
    const next = quickOrderTemplateAsNewOrderDefaults({
      v: QUICK_ORDER_VERSION,
      tiles: [
        {
          id: "b1",
          title: "Ждём сканы",
          accentColor: "#ef4444",
          basePriceListItemId: null,
          basePriceSummary: null,
          baseActive: true,
          isBlockTile: true,
          blockOnSave: false,
          blockReason: "нет КТ",
          options: [],
        },
      ],
      continueWork: { href: "/orders/1", label: "x" },
    });
    expect(next.continueWork).toBeNull();
    expect(next.tiles[0]).toMatchObject({
      isBlockTile: true,
      blockOnSave: true,
      blockReason: "нет КТ",
      baseActive: false,
    });
  });
});

describe("mergeQuickOrderFromSnapshot block tile", () => {
  it("reads isBlockTile and reason from snapshot", () => {
    const q = mergeQuickOrderFromSnapshot({
      v: 2,
      tiles: [
        {
          id: "t1",
          title: "Блок",
          accentColor: "#0ea5e9",
          isBlockTile: true,
          blockOnSave: true,
          blockReason: "ждём",
          options: [],
        },
      ],
    });
    expect(q.tiles[0]?.isBlockTile).toBe(true);
    expect(q.tiles[0]?.blockReason).toBe("ждём");
  });

  it("does not treat legacy composition+block as block tile", () => {
    const q = mergeQuickOrderFromSnapshot({
      v: 2,
      tiles: [
        {
          id: "t1",
          title: "Сплинт",
          accentColor: "#0ea5e9",
          basePriceListItemId: "pli-1",
          blockOnSave: true,
          blockReason: "разово",
          options: [],
        },
      ],
    });
    expect(q.tiles[0]?.isBlockTile).toBe(false);
    expect(q.tiles[0]?.blockOnSave).toBe(true);
  });
});
