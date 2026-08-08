import { describe, expect, it } from "vitest";
import {
  isPublicStickerHubImageMime,
  isPublicStickerHubAttachmentScope,
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

describe("isPublicStickerHubAttachmentScope", () => {
  it("SCANNER и GENERAL — да; платёжки — нет", () => {
    expect(isPublicStickerHubAttachmentScope("SCANNER")).toBe(true);
    expect(isPublicStickerHubAttachmentScope("GENERAL")).toBe(true);
    expect(isPublicStickerHubAttachmentScope("PAYMENT_SLIP")).toBe(false);
    expect(isPublicStickerHubScannerScope("GENERAL")).toBe(true);
  });
});
