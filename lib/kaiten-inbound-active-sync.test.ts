import { describe, expect, it } from "vitest";
import {
  inboundSyncBatchSize,
  inboundSyncGapMs,
  parseInboundCursor,
  parseInboundNextAllowedAt,
  shouldAllowInboundKaitenSync,
} from "@/lib/kaiten-inbound-active-sync";
import type { KaitenQueueMetrics } from "@/lib/kaiten-rest";

const emptyQueue: KaitenQueueMetrics = {
  queueDepth: 0,
  urgentDepth: 0,
  backgroundDepth: 0,
  oldestWaitMs: 0,
  draining: false,
};

describe("parseInboundCursor", () => {
  it("разбирает cursor из JSON", () => {
    expect(
      parseInboundCursor({
        lastOrderId: "ord-1",
        lastSyncedAt: "2026-07-03T10:00:00.000Z",
        cycle: 3,
      }),
    ).toEqual({
      lastOrderId: "ord-1",
      lastSyncedAt: "2026-07-03T10:00:00.000Z",
      cycle: 3,
    });
  });

  it("пустой/null → cycle 0", () => {
    expect(parseInboundCursor(null)).toEqual({ cycle: 0 });
  });
});

describe("parseInboundNextAllowedAt", () => {
  it("читает число и объект { at }", () => {
    expect(parseInboundNextAllowedAt(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(parseInboundNextAllowedAt({ at: 1_700_000_000_111 })).toBe(
      1_700_000_000_111,
    );
  });
});

describe("inbound sync budgets", () => {
  it("toast batch меньше cron batch", () => {
    expect(inboundSyncBatchSize("toast")).toBeLessThan(
      inboundSyncBatchSize("cron"),
    );
  });

  it("cron gap больше toast gap", () => {
    expect(inboundSyncGapMs("cron")).toBeGreaterThan(inboundSyncGapMs("toast"));
  });
});

describe("shouldAllowInboundKaitenSync", () => {
  it("блокирует до nextAllowedAt", () => {
    const gate = shouldAllowInboundKaitenSync({
      nowMs: 1_000,
      nextAllowedAtMs: 5_000,
      queueMetrics: emptyQueue,
      source: "toast",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("throttled");
  });

  it("блокирует inbound при urgent backlog", () => {
    const gate = shouldAllowInboundKaitenSync({
      nowMs: 10_000,
      nextAllowedAtMs: null,
      queueMetrics: {
        ...emptyQueue,
        queueDepth: 3,
        urgentDepth: 2,
        oldestWaitMs: 100,
      },
      source: "toast",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("urgent_backlog");
  });

  it("cron откладывается при любом urgent в очереди", () => {
    const gate = shouldAllowInboundKaitenSync({
      nowMs: 10_000,
      nextAllowedAtMs: null,
      queueMetrics: {
        ...emptyQueue,
        queueDepth: 1,
        urgentDepth: 1,
        oldestWaitMs: 50,
      },
      source: "cron",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("cron_defer_urgent");
  });

  it("разрешает toast sync при свободной очереди", () => {
    const gate = shouldAllowInboundKaitenSync({
      nowMs: 10_000,
      nextAllowedAtMs: 9_000,
      queueMetrics: emptyQueue,
      source: "toast",
    });
    expect(gate.allowed).toBe(true);
    expect(gate.reason).toBe("ok");
  });
});
