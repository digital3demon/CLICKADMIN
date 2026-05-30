import { describe, expect, it, vi } from "vitest";
import { EmailFolderType, EmailSyncMode } from "@prisma/client";
import {
  evaluateIncomingRules,
  inferFolderType,
  ruleMatches,
  shouldSyncFolderForMode,
} from "./mail-sync.service";

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
  it("keeps recent sync focused on folders that can affect day-to-day mail", () => {
    expect(shouldSyncFolderForMode(EmailFolderType.INBOX, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.SENT, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.CUSTOM, EmailSyncMode.RECENT)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.ARCHIVE, EmailSyncMode.RECENT)).toBe(false);
    expect(shouldSyncFolderForMode(EmailFolderType.SPAM, EmailSyncMode.RECENT)).toBe(false);
    expect(shouldSyncFolderForMode(EmailFolderType.TRASH, EmailSyncMode.RECENT)).toBe(false);
    expect(shouldSyncFolderForMode(EmailFolderType.DRAFTS, EmailSyncMode.RECENT)).toBe(false);
  });

  it("allows explicit backfill to walk all folders", () => {
    expect(shouldSyncFolderForMode(EmailFolderType.INBOX, EmailSyncMode.BACKFILL)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.SENT, EmailSyncMode.BACKFILL)).toBe(true);
    expect(shouldSyncFolderForMode(EmailFolderType.ARCHIVE, EmailSyncMode.BACKFILL)).toBe(true);
  });
});

describe("mail rule matching", () => {
  const message = {
    from: "Стоматология Dent Deco scans@example.ru",
    toCc: "order@digitaldemon.studio copy@example.ru",
    subject: "Скан Кочкина",
    body: "пациент Кочкина И.А. Врач Афанасьева",
    attachmentNames: ["scan_kokina.stl", "photo.jpg"],
  };

  it("matches any condition across supported fields", () => {
    expect(
      ruleMatches(
        {
          conditions: {
            any: [
              { field: "from", contains: "не совпадает" },
              { field: "attachmentName", contains: "stl" },
            ],
          },
        },
        message,
      ),
    ).toBe(true);
    expect(
      ruleMatches(
        {
          conditions: {
            any: [{ field: "toCc", contains: "copy@example.ru" }],
          },
        },
        message,
      ),
    ).toBe(true);
  });

  it("keeps legacy from subject body rules working", () => {
    expect(ruleMatches({ conditions: { from: "dent deco", subject: "", body: "" } }, message)).toBe(true);
    expect(ruleMatches({ conditions: { from: "", subject: "Скан", body: "" } }, message)).toBe(true);
  });

  it("accumulates actions and stops when stopProcessing is set", () => {
    const result = evaluateIncomingRules(
      [
        {
          conditions: { any: [{ field: "subject", contains: "Скан" }] },
          actions: {
            labelIds: ["scan-label"],
            moveToFolderId: "scan-folder",
            stopProcessing: true,
          },
        },
        {
          conditions: { any: [{ field: "body", contains: "Кочкина" }] },
          actions: {
            labelIds: ["doctor-label"],
            markRead: true,
            moveToFolderId: "doctor-folder",
          },
        },
      ] as never,
      message,
    );
    expect(result.labelIds).toEqual(["scan-label"]);
    expect(result.folderId).toBe("scan-folder");
    expect(result.isRead).toBe(false);
    expect(result.stopProcessing).toBe(true);
  });

  it("handles Cyrillic contains without word-boundary assumptions", () => {
    expect(
      ruleMatches(
        {
          conditions: {
            any: [{ field: "body", contains: "пациент Кочкина" }],
          },
        },
        message,
      ),
    ).toBe(true);
  });
});
