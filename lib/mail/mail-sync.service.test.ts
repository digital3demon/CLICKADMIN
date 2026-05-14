import { describe, expect, it, vi } from "vitest";
import { EmailFolderType, EmailSyncMode } from "@prisma/client";
import { inferFolderType, shouldSyncFolderForMode } from "./mail-sync.service";

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

describe("shouldSyncFolderForMode", () => {
  it("syncs all folders in recent mode so moved and sent mail are not missed", () => {
    expect(shouldSyncFolderForMode(EmailFolderType.INBOX, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.SENT, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.ARCHIVE, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.CUSTOM, EmailSyncMode.RECENT)).toBe(true);
  });

  it("allows explicit backfill to walk all folders", () => {
    expect(shouldSyncFolderForMode(EmailFolderType.INBOX, EmailSyncMode.BACKFILL)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.SENT, EmailSyncMode.BACKFILL)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.ARCHIVE, EmailSyncMode.BACKFILL)).toBe(true);
  });
});
