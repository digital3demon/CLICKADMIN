import { describe, expect, it, vi } from "vitest";
import { EmailFolderType } from "@prisma/client";
import { inferFolderType } from "./mail-sync.service";

vi.mock("server-only", () => ({}));

describe("inferFolderType", () => {
  it("detects Yandex and Cyrillic system folders", () => {
    expect(inferFolderType("INBOX")).toBe(EmailFolderType.INBOX);
    expect(inferFolderType("Отправленные")).toBe(EmailFolderType.SENT);
    expect(inferFolderType("Черновики")).toBe(EmailFolderType.DRAFTS);
    expect(inferFolderType("Спам")).toBe(EmailFolderType.SPAM);
    expect(inferFolderType("Корзина")).toBe(EmailFolderType.TRASH);
    expect(inferFolderType("Архив")).toBe(EmailFolderType.ARCHIVE);
  });
});
