import { describe, expect, it } from "vitest";
import {
  formatCrmLogRecordLine,
  validateCrmLogExportRange,
} from "@/lib/server/crm-log-export";
import { listDaysInclusive } from "@/lib/server/log-dir";

describe("listDaysInclusive", () => {
  it("includes both ends", () => {
    expect(listDaysInclusive("2026-05-28", "2026-05-30")).toEqual([
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
    ]);
  });

  it("rejects inverted range", () => {
    expect(listDaysInclusive("2026-05-30", "2026-05-28")).toEqual([]);
  });
});

describe("validateCrmLogExportRange", () => {
  it("rejects invalid from date", () => {
    const r = validateCrmLogExportRange("bad", "2026-05-01");
    expect(r.ok).toBe(false);
  });

  it("accepts valid range", () => {
    const r = validateCrmLogExportRange("2026-05-01", "2026-05-03");
    expect(r).toEqual({ ok: true, from: "2026-05-01", to: "2026-05-03" });
  });
});

describe("formatCrmLogRecordLine", () => {
  it("formats channel and кириллица in payload", () => {
    const line = formatCrmLogRecordLine({
      time: Date.parse("2026-05-29T12:00:00.000Z"),
      level: 20,
      channel: "kaiten",
      msg: "kaiten_correction_created",
      textSnippet: "корр 4 накладки",
      authorLabel: "Арина",
    });
    expect(line).toContain("[kaiten]");
    expect(line).toContain("kaiten_correction_created");
    expect(line).toContain("корр 4 накладки");
    expect(line).toContain("Арина");
  });
});
