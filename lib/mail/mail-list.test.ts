import { describe, expect, it, vi } from "vitest";
import { EmailDirection } from "@prisma/client";
import { mapEmailListRow } from "./mail-service";

vi.mock("server-only", () => ({}));

describe("mapEmailListRow", () => {
  it("does not expose htmlBody in list rows and builds preview from html", () => {
    const row = mapEmailListRow({
      id: "email_1",
      accountId: "acc_1",
      folderId: "folder_1",
      direction: EmailDirection.INBOUND,
      isRead: false,
      isFlagged: false,
      hasAttachments: true,
      fromName: "Тест",
      fromAddress: "test@example.ru",
      subject: "Тема",
      preview: null,
      textBody: null,
      htmlBody: "<p>Текст из HTML</p>",
      receivedAt: new Date("2026-05-30T12:00:00.000Z"),
      sentAt: null,
      createdAt: new Date("2026-05-30T12:00:00.000Z"),
      labelAssignments: [],
      sourceOrderLinks: [],
      _count: { attachments: 2, sourceOrderLinks: 0 },
    });
    expect(row.preview).toBe("Текст из HTML");
    expect("htmlBody" in row).toBe(false);
    expect("textBody" in row).toBe(false);
  });
});
