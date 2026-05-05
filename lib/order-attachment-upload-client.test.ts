import { describe, expect, it } from "vitest";
import { isRetryableAttachmentUploadHttpStatus } from "@/lib/order-attachment-upload-client";

describe("isRetryableAttachmentUploadHttpStatus", () => {
  it("retries transient server and rate limit", () => {
    expect(isRetryableAttachmentUploadHttpStatus(503)).toBe(true);
    expect(isRetryableAttachmentUploadHttpStatus(429)).toBe(true);
    expect(isRetryableAttachmentUploadHttpStatus(408)).toBe(true);
  });

  it("does not retry client errors", () => {
    expect(isRetryableAttachmentUploadHttpStatus(400)).toBe(false);
    expect(isRetryableAttachmentUploadHttpStatus(415)).toBe(false);
  });
});
