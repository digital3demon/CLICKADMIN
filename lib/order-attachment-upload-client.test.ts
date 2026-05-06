import { describe, expect, it } from "vitest";
import {
  isRetryableAttachmentUploadHttpStatus,
  normalizeOrderAttachmentUploadQueue,
} from "@/lib/order-attachment-upload-client";

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

describe("normalizeOrderAttachmentUploadQueue", () => {
  const max = 1024;

  it("drops empty files and aligns total with uploads", () => {
    const q = normalizeOrderAttachmentUploadQueue(
      [
        new File([new Uint8Array([1])], "a.txt"),
        new File([], "empty.txt"),
        new File([new Uint8Array([2])], "b.txt"),
      ],
      max,
    );
    expect(q.skippedEmpty).toBe(true);
    expect(q.skippedTooLarge).toBe(false);
    expect(q.queue.map((f) => f.name)).toEqual(["a.txt", "b.txt"]);
  });

  it("dedupes same name+size (double paste style)", () => {
    const blob = new File([new Uint8Array([1])], "фото.png");
    const q = normalizeOrderAttachmentUploadQueue([blob, blob], max);
    expect(q.queue).toHaveLength(1);
  });
});
