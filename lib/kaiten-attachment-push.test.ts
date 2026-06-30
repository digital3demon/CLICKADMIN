import { describe, expect, it } from "vitest";
import {
  KAITEN_PUSH_IN_FLIGHT_AT,
  isOrderAttachmentUploadedToKaiten,
} from "@/lib/kaiten-attachment-upload-state";

describe("isOrderAttachmentUploadedToKaiten", () => {
  it("false для null и маркера in-flight", () => {
    expect(isOrderAttachmentUploadedToKaiten(null)).toBe(false);
    expect(isOrderAttachmentUploadedToKaiten(KAITEN_PUSH_IN_FLIGHT_AT)).toBe(false);
  });

  it("true для реальной даты выгрузки", () => {
    expect(isOrderAttachmentUploadedToKaiten(new Date("2026-06-30T12:00:00Z"))).toBe(
      true,
    );
  });
});
