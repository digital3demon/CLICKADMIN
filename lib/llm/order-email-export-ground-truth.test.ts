import { describe, expect, it } from "vitest";
import {
  emailAttachmentIdsMatchingOrderFiles,
  compositionHintsFromOrderConstructions,
} from "./order-email-export-ground-truth";
import { predictionNeedsReEnrichment, ORDER_EMAIL_ENRICHMENT_VERSION } from "./order-email-enrichment-version";

describe("order-email-export-ground-truth", () => {
  it("matches order files to email attachment ids by file name", () => {
    const ids = emailAttachmentIdsMatchingOrderFiles(
      [{ fileName: "lower.stl", mimeType: "model/stl" }],
      [{ id: "e1", fileName: "lower.stl", mimeType: "model/stl" }],
    );
    expect(ids).toEqual(["e1"]);
  });

  it("builds composition hints from order constructions", () => {
    const hints = compositionHintsFromOrderConstructions([
      {
        quantity: 1,
        teethFdi: ["46"],
        priceListItem: { code: "002", name: "Коронка Emax" },
      },
    ]);
    expect(hints).toEqual([
      { nameHint: "Коронка Emax", quantity: 1, teethFdi: ["46"] },
    ]);
  });
});

describe("predictionNeedsReEnrichment", () => {
  it("requires re-enrich when version missing", () => {
    expect(predictionNeedsReEnrichment({ workReceivedAt: "x", dueDate: "y" })).toBe(true);
  });

  it("accepts fully enriched prediction", () => {
    expect(
      predictionNeedsReEnrichment({
        enrichmentVersion: ORDER_EMAIL_ENRICHMENT_VERSION,
        workReceivedAt: "2026-06-02T10:00:00.000Z",
        dueDate: "2026-06-11T12:00:00.000Z",
        resolvedConstructions: [],
        clientOrderText: "текст",
      }),
    ).toBe(false);
  });
});
