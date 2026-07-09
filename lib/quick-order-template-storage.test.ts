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
  saveQuickOrderTemplate,
} from "./quick-order-template-storage";
import { QUICK_ORDER_VERSION } from "@/components/orders/new-order-form/quick-order-types";

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
