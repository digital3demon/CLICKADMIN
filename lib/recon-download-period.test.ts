import { describe, expect, it } from "vitest";
import { resolveReconDownloadPeriod } from "@/lib/recon-download-period";
import { slotForYmdRange } from "@/lib/reconciliation-calendar-period";
import { formatYmdDdMmYy } from "@/lib/clinic-reconciliation-pdf-format";

describe("resolveReconDownloadPeriod", () => {
  const row = {
    periodFromStr: "2026-08-16",
    periodToStr: "2026-08-31",
    slot: "SECOND_HALF" as const,
  };

  it("пустые поля — слот карточки", () => {
    const r = resolveReconDownloadPeriod(row, { from: "", to: "" });
    expect(r).toEqual({
      ok: true,
      from: "2026-08-16",
      to: "2026-08-31",
      slot: "SECOND_HALF",
      manual: false,
    });
  });

  it("ручной прошлый период 1–15", () => {
    const r = resolveReconDownloadPeriod(row, {
      from: "2026-08-01",
      to: "2026-08-15",
    });
    expect(r).toEqual({
      ok: true,
      from: "2026-08-01",
      to: "2026-08-15",
      slot: "FIRST_HALF",
      manual: true,
    });
  });

  it("одна дата без второй — ошибка, кириллица в тексте", () => {
    const r = resolveReconDownloadPeriod(row, { from: "2026-08-16", to: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/обе даты|с» и «по/);
  });
});

describe("slotForYmdRange", () => {
  it("16–28 остаётся вторая половина", () => {
    expect(slotForYmdRange("2026-08-16", "2026-08-28")).toBe("SECOND_HALF");
  });

  it("1–28 одного месяца — весь месяц", () => {
    expect(slotForYmdRange("2026-08-01", "2026-08-28")).toBe("MONTHLY_FULL");
  });
});

describe("formatYmdDdMmYy", () => {
  it("по 28.08 в PDF не становится 29 из‑за UTC 23:59", () => {
    const to = new Date(Date.UTC(2026, 7, 28, 23, 59, 59, 999));
    expect(to.toISOString().slice(0, 10)).toBe("2026-08-28");
    expect(formatYmdDdMmYy("2026-08-28")).toBe("28.08.26");
  });
});
