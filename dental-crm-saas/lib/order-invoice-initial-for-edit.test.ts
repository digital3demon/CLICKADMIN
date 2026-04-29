import { describe, expect, it } from "vitest";
import { invoiceParsedSnapshotForOrderEdit } from "./order-invoice-initial-for-edit";

describe("invoiceParsedSnapshotForOrderEdit", () => {
  it("returns nulls when invoice row missing but id still set (dangling FK)", () => {
    const r = invoiceParsedSnapshotForOrderEdit({
      invoiceAttachmentId: "orphan-id",
      invoiceAttachment: null,
      invoiceParsedLines: [{ name: "x" }],
      invoiceParsedTotalRub: 22_500,
      invoiceParsedSummaryText: "old",
    });
    expect(r).toEqual({
      invoiceParsedLines: null,
      invoiceParsedTotalRub: null,
      invoiceParsedSummaryText: null,
    });
  });

  it("returns stored parsed data when invoice row exists", () => {
    const lines = [{ name: "позиция" }];
    const r = invoiceParsedSnapshotForOrderEdit({
      invoiceAttachmentId: "att-1",
      invoiceAttachment: { createdAt: new Date() },
      invoiceParsedLines: lines,
      invoiceParsedTotalRub: 22_500,
      invoiceParsedSummaryText: "txt",
    });
    expect(r).toEqual({
      invoiceParsedLines: lines,
      invoiceParsedTotalRub: 22_500,
      invoiceParsedSummaryText: "txt",
    });
  });

  it("without include: falls back to invoiceAttachmentId only", () => {
    const r = invoiceParsedSnapshotForOrderEdit({
      invoiceAttachmentId: "x",
      invoiceParsedLines: null,
      invoiceParsedTotalRub: 100,
      invoiceParsedSummaryText: null,
    });
    expect(r.invoiceParsedTotalRub).toBe(100);
  });
});
