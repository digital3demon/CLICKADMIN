import { describe, expect, it } from "vitest";
import {
  getKaitenQueueMetrics,
  isKaitenUrgentBacklogHigh,
} from "@/lib/kaiten-rest";

describe("getKaitenQueueMetrics", () => {
  it("пустая очередь → нулевые метрики", () => {
    const m = getKaitenQueueMetrics(1_000_000);
    expect(m.queueDepth).toBe(0);
    expect(m.urgentDepth).toBe(0);
    expect(m.backgroundDepth).toBe(0);
    expect(m.oldestWaitMs).toBe(0);
  });
});

describe("isKaitenUrgentBacklogHigh", () => {
  it("не блокирует при пустой очереди", () => {
    expect(isKaitenUrgentBacklogHigh(undefined, 1_000_000)).toBe(false);
  });
});
