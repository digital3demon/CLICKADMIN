import { EmailDirection, EmailFolderType, type Prisma } from "@prisma/client";

/**
 * «Входящие» в UI — все входящие письма ящика (в т.ч. после правил в _Заказы),
 * но без исходящих «Re:» / «Вы». Остальные папки — строго по folderId.
 */
export function emailFolderListWhere(
  tenantId: string,
  folder: { id: string; type: EmailFolderType; accountId?: string },
  accountId?: string,
): Prisma.EmailWhereInput {
  const resolvedAccountId = accountId ?? folder.accountId;
  if (folder.type === EmailFolderType.INBOX && resolvedAccountId) {
    return { tenantId, accountId: resolvedAccountId, direction: EmailDirection.INBOUND };
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
