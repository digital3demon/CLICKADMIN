import { describe, expect, it } from "vitest";
import {
  isAllowedLabTaskImageMime,
  LAB_TASK_MAX_ATTACHMENTS,
  labTaskAttachmentUrl,
  labTaskKindToQuery,
  parseLabTaskKindParam,
} from "@/lib/lab-tasks";

describe("lab-tasks", () => {
  it("allows common image mime types", () => {
    expect(isAllowedLabTaskImageMime("image/png")).toBe(true);
    expect(isAllowedLabTaskImageMime("image/jpeg")).toBe(true);
    expect(isAllowedLabTaskImageMime("application/pdf")).toBe(false);
  });

  it("builds attachment url", () => {
    expect(labTaskAttachmentUrl("t1", "a1")).toBe(
      "/api/lab-tasks/t1/attachments/a1",
    );
  });

  it("limits attachments count constant", () => {
    expect(LAB_TASK_MAX_ATTACHMENTS).toBeGreaterThan(0);
  });

  it("parses kind query for task vs pickup_from", () => {
    expect(parseLabTaskKindParam(null)).toBe("TASK");
    expect(parseLabTaskKindParam("task")).toBe("TASK");
    expect(parseLabTaskKindParam("pickup_from")).toBe("PICKUP_FROM");
    expect(parseLabTaskKindParam("pickups")).toBe("PICKUP_FROM");
    expect(labTaskKindToQuery("PICKUP_FROM")).toBe("pickup_from");
    expect(labTaskKindToQuery("TASK")).toBe("task");
  });
});
