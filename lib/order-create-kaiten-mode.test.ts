import { describe, expect, it } from "vitest";
import { resolveOrderCreateKaitenMode } from "@/lib/order-create-kaiten-mode";

describe("resolveOrderCreateKaitenMode", () => {
  it("CRM без Kaiten: тип и пространство нужны, env досок нет", () => {
    const m = resolveOrderCreateKaitenMode({
      createKanbanWithoutKaiten: true,
      kaitenCardTypeId: "t-сплинт",
      kaitenTrackLane: "ORTHODONTICS",
    });
    expect(m.needPlacementFields).toBe(true);
    expect(m.needKaitenEnvBoards).toBe(false);
    expect(m.scheduleKaitenSync).toBe(false);
  });

  it("decideLater не планирует sync", () => {
    const m = resolveOrderCreateKaitenMode({
      kaitenDecideLater: true,
      kaitenCardTypeId: "t-сплинт",
      kaitenTrackLane: "ORTHOPEDICS",
    });
    expect(m.createKanbanWithoutKaiten).toBe(true);
    expect(m.scheduleKaitenSync).toBe(false);
    expect(m.needKaitenEnvBoards).toBe(false);
  });

  it("полный путь с Kaiten требует env", () => {
    const m = resolveOrderCreateKaitenMode({
      kaitenCardTypeId: "t-сплинт",
      kaitenTrackLane: "ORTHOPEDICS",
    });
    expect(m.needKaitenEnvBoards).toBe(true);
    expect(m.scheduleKaitenSync).toBe(true);
  });

  it("интеграция выключена: без env досок, sync не планируем", () => {
    const m = resolveOrderCreateKaitenMode({
      kaitenCardTypeId: "t-сплинт",
      kaitenTrackLane: "ORTHOPEDICS",
      kaitenIntegrationOff: true,
    });
    expect(m.createKanbanWithoutKaiten).toBe(true);
    expect(m.needKaitenEnvBoards).toBe(false);
    expect(m.scheduleKaitenSync).toBe(false);
    expect(m.needPlacementFields).toBe(true);
  });
});
