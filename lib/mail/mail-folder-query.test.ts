import { describe, expect, it } from "vitest";
import { EmailDirection, EmailFolderType } from "@prisma/client";
import { emailDirectionForImapFolder, emailFolderListWhere } from "./mail-folder-query";

describe("emailFolderListWhere", () => {
  it("inbox lists all inbound messages for the account", () => {
    expect(
      emailFolderListWhere(
        "tenant_1",
        { id: "folder_inbox", type: EmailFolderType.INBOX },
        "account_1",
      ),
    ).toEqual({
      tenantId: "tenant_1",
      accountId: "account_1",
      direction: EmailDirection.INBOUND,
    });
  });

  it("custom folder lists all messages in that folder", () => {
    expect(
      emailFolderListWhere("tenant_1", { id: "folder_custom", type: EmailFolderType.CUSTOM }),
    ).toEqual({
      tenantId: "tenant_1",
      folderId: "folder_custom",
    });
  });
});

describe("emailDirectionForImapFolder", () => {
  it("marks own address in IMAP inbox as outbound", () => {
    expect(
      emailDirectionForImapFolder(
        EmailFolderType.INBOX,
        "order@digitaldemon.studio",
        "order@digitaldemon.studio",
      ),
    ).toBe(EmailDirection.OUTBOUND);
  });

  it("keeps external sender in IMAP inbox as inbound", () => {
    expect(
      emailDirectionForImapFolder(
        EmailFolderType.INBOX,
        "client@example.com",
        "order@digitaldemon.studio",
      ),
    ).toBe(EmailDirection.INBOUND);
  });
});
