import { describe, expect, it } from "vitest";
import {
  isImportableCloudFolderUrl,
  parseCloudFolderImportUrl,
} from "@/lib/work-examples/cloud-folder-url";

describe("parseCloudFolderImportUrl", () => {
  it("Google Drive папка: кириллица до и после URL", () => {
    const raw =
      "фиксация https://drive.google.com/drive/folders/125-WE5-DnrAXjhlDm1o2h25sEoHiCfKp?usp=sharing накладки";
    const url = raw.match(/https?:\/\/\S+/u)?.[0] ?? raw;
    const parsed = parseCloudFolderImportUrl(url);
    expect(parsed).toMatchObject({
      provider: "google-drive",
      mode: "folder",
      driveId: "125-WE5-DnrAXjhlDm1o2h25sEoHiCfKp",
    });
  });

  it("Яндекс 360 client/aa/d_KEY → публичный /d/KEY", () => {
    const parsed = parseCloudFolderImportUrl(
      "https://disk.360.yandex.ru/client/aa/d_cbZa2KJK1Suvdg/",
    );
    expect(parsed).toEqual({
      provider: "yandex-disk",
      mode: "folder",
      sourceUrl: "https://disk.360.yandex.ru/client/aa/d_cbZa2KJK1Suvdg/",
      yandexPublicUrl: "https://disk.yandex.ru/d/cbZa2KJK1Suvdg",
    });
  });

  it("Яндекс /d/ среди кириллицы", () => {
    const parsed = parseCloudFolderImportUrl(
      "https://disk.yandex.ru/d/папка_верх",
    );
    expect(parsed).toMatchObject({
      provider: "yandex-disk",
      mode: "folder",
      yandexPublicUrl: "https://disk.yandex.ru/d/папка_верх",
    });
  });

  it("Яндекс файл /i/ и Drive файл /file/d/", () => {
    expect(parseCloudFolderImportUrl("https://disk.yandex.ru/i/kiGouEaqpXUtMg")).toMatchObject({
      provider: "yandex-disk",
      mode: "file",
      yandexPublicUrl: "https://disk.yandex.ru/i/kiGouEaqpXUtMg",
    });
    expect(
      parseCloudFolderImportUrl("https://drive.google.com/file/d/1abcDEF-0123456789xyz/view"),
    ).toMatchObject({
      provider: "google-drive",
      mode: "file",
      driveId: "1abcDEF-0123456789xyz",
    });
  });

  it("чужой хост и пустое — не импорт", () => {
    expect(isImportableCloudFolderUrl("https://example.com/d/abc")).toBe(false);
    expect(parseCloudFolderImportUrl("")).toBeNull();
  });
});
