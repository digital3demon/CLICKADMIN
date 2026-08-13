import { describe, expect, it } from "vitest";
import {
  isRetryableAttachmentUploadHttpStatus,
  formatAttachmentUploadHttpError,
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

describe("formatAttachmentUploadHttpError", () => {
  it("joins route error+details", () => {
    expect(
      formatAttachmentUploadHttpError(
        500,
        { error: "Не удалось сохранить файл", details: "disk full" },
        "",
      ),
    ).toBe("Не удалось сохранить файл: disk full");
  });

  it("uses Next message when error field missing", () => {
    expect(
      formatAttachmentUploadHttpError(
        500,
        { message: "Internal Server Error" },
        '{"message":"Internal Server Error"}',
      ),
    ).toBe("Ошибка загрузки (500): Internal Server Error");
  });

  it("falls back to raw body snippet", () => {
    expect(
      formatAttachmentUploadHttpError(502, {}, "<html>bad gateway</html>"),
    ).toBe(
      "Ошибка загрузки (502): сбой сервера (HTML вместо JSON). Проверьте логи PM2 и лимит тела (Caddy/nginx), затем migrate deploy.",
    );
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
