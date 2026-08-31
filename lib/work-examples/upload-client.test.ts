import { describe, expect, it } from "vitest";
import {
  formatWorkExampleUploadHttpError,
  isWorkExampleFileOverLimit,
  workExampleFileTooLargeMessage,
  workExampleUploadTimeoutMs,
} from "@/lib/work-examples/upload-client";
import { WORK_EXAMPLE_MAX_FILE_BYTES } from "@/lib/work-examples/constants";

describe("work example upload client", () => {
  it("читает JSON-ошибку с кириллицей в имени", () => {
    expect(
      formatWorkExampleUploadHttpError(
        400,
        { error: "Нет файлов" },
        "",
        "Аношина кольца.zip",
      ),
    ).toBe("«Аношина кольца.zip»: Нет файлов");
  });

  it("HTML 413 не маскирует под «не удалось»", () => {
    expect(
      formatWorkExampleUploadHttpError(413, {}, "<html>too large</html>", "кольца.zip"),
    ).toMatch(/кольца\.zip.*большой|лимит/);
  });

  it("таймаут растёт с размером, лимит как у наряда", () => {
    expect(workExampleUploadTimeoutMs(1_000_000)).toBeGreaterThanOrEqual(90_000);
    expect(isWorkExampleFileOverLimit(WORK_EXAMPLE_MAX_FILE_BYTES)).toBe(false);
    expect(isWorkExampleFileOverLimit(WORK_EXAMPLE_MAX_FILE_BYTES + 1)).toBe(true);
    expect(workExampleFileTooLargeMessage("сцена.html")).toMatch(/сцена\.html/);
  });
});
