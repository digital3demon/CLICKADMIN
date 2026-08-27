import { describe, expect, it } from "vitest";
import {
  reconciliationAttachmentDisposition,
  reconciliationFileAsciiStem,
  reconciliationFileStem,
  sanitizeReconFileLegal,
  ymdToDottedRu,
} from "@/lib/clinic-reconciliation-filename";

describe("reconciliationFileStem", () => {
  it("кириллица юрлица до и после периода", () => {
    expect(
      reconciliationFileStem(
        "ОП ООО «РЕМИ» (Атрибут Клиник)",
        "2026-08-16",
        "2026-08-31",
      ),
    ).toBe("СВЕРКА- ОП ООО РЕМИ (Атрибут Клиник)-16.08.2026-31.08.2026");
  });

  it("пустой юрлицо — запасное слово", () => {
    expect(reconciliationFileStem("   ", "2026-08-16", "2026-08-31")).toBe(
      "СВЕРКА- юрлицо-16.08.2026-31.08.2026",
    );
  });
});

describe("ymdToDottedRu / sanitize", () => {
  it("режет запрещённые символы вокруг кириллицы", () => {
    expect(sanitizeReconFileLegal('ООО "РЕМИ"/филиал')).toBe("ООО РЕМИ филиал");
    expect(ymdToDottedRu("2026-08-16")).toBe("16.08.2026");
  });
});

describe("reconciliationAttachmentDisposition", () => {
  it("ascii + UTF-8 имя с кириллицей", () => {
    const utf = "СВЕРКА- РЕМИ-16.08.2026-31.08.2026.zip";
    const ascii = reconciliationFileAsciiStem("2026-08-16", "2026-08-31") + ".zip";
    expect(reconciliationAttachmentDisposition(utf, ascii)).toContain(
      "filename*=UTF-8''",
    );
    expect(ascii).toBe("SVERKA-2026-08-16-2026-08-31.zip");
  });
});
