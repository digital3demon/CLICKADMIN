import { describe, expect, it } from "vitest";
import { endYmdKanbanDlinetm } from "@/lib/kanban-dline-end-ymd";

describe("endYmdKanbanDlinetm", () => {
  it("Thursday → Friday next calendar day", () => {
    expect(endYmdKanbanDlinetm("2026-05-07")).toBe("2026-05-08");
  });

  it("Friday → Monday (tomorrow weekend)", () => {
    expect(endYmdKanbanDlinetm("2026-05-08")).toBe("2026-05-11");
  });

  it("Sunday → Monday", () => {
    expect(endYmdKanbanDlinetm("2026-05-10")).toBe("2026-05-11");
  });
});
