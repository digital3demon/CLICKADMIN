import { describe, expect, it } from "vitest";
import {
  isPublicStickerHubImageMime,
  isPublicStickerHubScannerScope,
  stickerPublicAttachmentPath,
} from "@/lib/sticker-public-attachment-path";

describe("stickerPublicAttachmentPath", () => {
  it("builds encoded public URL", () => {
    expect(stickerPublicAttachmentPath("lab", "tok/1", "att 2")).toBe(
      "/api/public/sticker/lab/tok%2F1/attachments/att%202",
    );
  });
});

describe("isPublicStickerHubImageMime", () => {
  it("accepts image types only", () => {
    expect(isPublicStickerHubImageMime("image/jpeg")).toBe(true);
    expect(isPublicStickerHubImageMime("IMAGE/PNG")).toBe(true);
    expect(isPublicStickerHubImageMime("application/pdf")).toBe(false);
    expect(isPublicStickerHubImageMime("")).toBe(false);
  });
});

describe("isPublicStickerHubScannerScope", () => {
  it("only SCANNER", () => {
    expect(isPublicStickerHubScannerScope("SCANNER")).toBe(true);
    expect(isPublicStickerHubScannerScope("GENERAL")).toBe(false);
    expect(isPublicStickerHubScannerScope("PAYMENT_SLIP")).toBe(false);
  });
});
