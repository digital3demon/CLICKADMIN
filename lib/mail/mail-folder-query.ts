import { EmailDirection, EmailFolderType, type Prisma } from "@prisma/client";

/** Список и счётчики «Входящих»: только INBOUND (без исходящих «Re:» из IMAP INBOX). */
export function emailFolderListWhere(
  tenantId: string,
  folder: { id: string; type: EmailFolderType },
): Prisma.EmailWhereInput {
  if (folder.type === EmailFolderType.INBOX) {
    return { tenantId, folderId: folder.id, direction: EmailDirection.INBOUND };
  }
  return { tenantId, folderId: folder.id };
}

export function emailDirectionForImapFolder(
  folderType: EmailFolderType,
  fromAddress: string | null | undefined,
  accountEmail: string,
): typeof EmailDirection.INBOUND | typeof EmailDirection.OUTBOUND {
  if (folderType === EmailFolderType.SENT) return EmailDirection.OUTBOUND;
  const from = fromAddress?.trim().toLowerCase() ?? "";
  const self = accountEmail.trim().toLowerCase();
  if (from && self && from === self) return EmailDirection.OUTBOUND;
  return EmailDirection.INBOUND;
}
