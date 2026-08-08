import { describe, expect, it } from "vitest";
import {
  extractYandexDiskAttachmentsFromMail,
  extractYandexDiskNoticeFiles,
  isYandexDiskVirtualAttachmentId,
  mergeEmailAttachmentsWithYandexDisk,
} from "@/lib/mail/yandex-disk-mail-attachments";

describe("extractYandexDiskNoticeFiles", () => {
  it("parses notice with Cyrillic before and after filename", () => {
    const text =
      "пациент Самарина О.С. готово\nК письму приложены файлы на Яндекс Диске: Самарина О.С.rar (564746409)\nещё строка после";
    expect(extractYandexDiskNoticeFiles(text)).toEqual([
      { fileName: "Самарина О.С.rar", size: 564746409 },
    ]);
  });

  it("parses multiline notice like mail-text-cleanup fixture", () => {
    expect(
      extractYandexDiskNoticeFiles(
        "К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)",
      ),
    ).toEqual([{ fileName: "голубева КПКТ.zip", size: 82542801 }]);
  });

  it("returns empty without notice header", () => {
    expect(extractYandexDiskNoticeFiles("просто файл.zip (12345)")).toEqual([]);
  });
});

describe("extractYandexDiskAttachmentsFromMail", () => {
  it("pairs single disk URL with notice file", () => {
    const out = extractYandexDiskAttachmentsFromMail({
      textBody:
        "К письму приложены файлы на Яндекс Диске: Самарина О.С.rar (564746409)\nhttps://disk.yandex.ru/d/abcDiskId",
    });
    expect(out).toEqual([
      {
        fileName: "Самарина О.С.rar",
        size: 564746409,
        url: "https://disk.yandex.ru/d/abcDiskId",
      },
    ]);
  });

  it("keeps notice file without URL (Yandex body often has name+size only)", () => {
    const out = extractYandexDiskAttachmentsFromMail({
      textBody:
        "К письму приложены файлы на Яндекс Диске: Самарина О.С.rar (564746409)",
    });
    expect(out).toEqual([
      { fileName: "Самарина О.С.rar", size: 564746409, url: null },
    ]);
  });

  it("extracts disk URL from HTML when plain text has only notice", () => {
    const out = extractYandexDiskAttachmentsFromMail({
      textBody:
        "К письму приложены файлы на Яндекс Диске: Самарина О.С.rar (564746409)",
      htmlBody:
        '<p>файл</p><a href="https://disk.yandex.ru/d/FromHtmlOnly">скачать</a>',
    });
    expect(out[0]?.url).toBe("https://disk.yandex.ru/d/FromHtmlOnly");
  });

  it("surfaces URL-only disk links without notice", () => {
    const out = extractYandexDiskAttachmentsFromMail({
      textBody: "Сканы: https://yadi.sk/d/folderLink",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.url).toBe("https://yadi.sk/d/folderLink");
    expect(out[0]?.fileName).toMatch(/Яндекс\.Диск/);
  });
});

describe("mergeEmailAttachmentsWithYandexDisk", () => {
  it("keeps MIME PDF and adds virtual RAR from notice", () => {
    const merged = mergeEmailAttachmentsWithYandexDisk(
      [
        {
          id: "mime-pdf",
          fileName: "Наряд_Хирургия Самарина О.С..pdf",
          mimeType: "application/pdf",
          size: 398_000,
        },
      ],
      {
        textBody:
          "К письму приложены файлы на Яндекс Диске: Самарина О.С.rar (564746409)",
      },
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]?.fileName).toContain(".pdf");
    expect(merged[1]?.fileName).toBe("Самарина О.С.rar");
    expect(merged[1]?.size).toBe(564746409);
    expect(isYandexDiskVirtualAttachmentId(merged[1]!.id)).toBe(true);
    expect(merged[1]?.externalUrl).toBeNull();
  });

  it("does not duplicate MIME file with same name", () => {
    const merged = mergeEmailAttachmentsWithYandexDisk(
      [
        {
          id: "mime-zip",
          fileName: "голубева КПКТ.zip",
          mimeType: "application/zip",
          size: 100,
        },
      ],
      {
        textBody:
          "К письму приложены файлы на Яндекс Диске:\nголубева КПКТ.zip (82542801)\nhttps://disk.yandex.ru/d/same",
      },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.externalUrl).toBe("https://disk.yandex.ru/d/same");
  });
});
