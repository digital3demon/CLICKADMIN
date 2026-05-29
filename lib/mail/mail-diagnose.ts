import "server-only";

import type { EmailAccount, PrismaClient } from "@prisma/client";
import { createImapClient, listImapFolders } from "@/lib/mail/imap-client";
import { inferFolderType } from "@/lib/mail/mail-sync.service";

export type MailDiagnoseFolderMessage = {
  uid: number;
  subject: string | null;
  date: string | null;
  from: string | null;
};

export type MailDiagnoseFolder = {
  path: string;
  type: string;
  imapMessages: number;
  imapUidNext: number | null;
  imapUidValidity: number | null;
  dbLastSyncedUid: number | null;
  dbUidValidity: string | null;
  gap: number;
  latestImapMessages: MailDiagnoseFolderMessage[];
  dbHasThisUid: boolean;
};

export type MailDiagnoseResult = {
  accountId: string;
  syncedAt: string;
  folders: MailDiagnoseFolder[];
};

function envelopeFrom(item: {
  envelope?: {
    subject?: unknown;
    from?: Array<{ name?: unknown; address?: unknown }>;
  };
  internalDate?: Date | string | null;
}): { subject: string | null; from: string | null; date: string | null } {
  const envelope = item.envelope;
  const [from] = Array.isArray(envelope?.from) ? envelope.from : [];
  const fromText =
    [from?.name, from?.address].filter((value) => typeof value === "string" && value).join(" ") || null;
  const internalDate =
    item.internalDate instanceof Date
      ? item.internalDate
      : item.internalDate
        ? new Date(item.internalDate)
        : null;
  return {
    subject: typeof envelope?.subject === "string" ? envelope.subject : null,
    from: fromText,
    date: internalDate && !Number.isNaN(internalDate.getTime()) ? internalDate.toISOString() : null,
  };
}

function computeGap(uidNext: number | null, dbLastSyncedUid: number | null): number {
  if (uidNext == null || uidNext <= 1) return 0;
  const highestUid = uidNext - 1;
  if (dbLastSyncedUid == null) return highestUid;
  return Math.max(0, highestUid - dbLastSyncedUid);
}

export async function diagnoseEmailAccountImap(
  db: PrismaClient,
  account: EmailAccount,
): Promise<MailDiagnoseResult> {
  const client = createImapClient(account);
  await client.connect();
  try {
    const dbFolders = await db.emailFolder.findMany({
      where: { tenantId: account.tenantId, accountId: account.id },
      select: {
        id: true,
        imapName: true,
        lastSyncedUid: true,
        lastBackfillUid: true,
        uidValidity: true,
      },
    });
    const dbFolderByImapName = new Map(dbFolders.map((folder) => [folder.imapName, folder]));
    const listedFolders = await listImapFolders(client);
    const folders: MailDiagnoseFolder[] = [];

    for (const listed of listedFolders) {
      const lock = await client.getMailboxLock(listed.path);
      try {
        const mailbox = client.mailbox;
        if (!mailbox) continue;
        const imapUidNext = mailbox.uidNext ?? null;
        const imapUidValidity =
          mailbox.uidValidity != null && Number.isFinite(mailbox.uidValidity)
            ? Number(mailbox.uidValidity)
            : null;
        const imapMessages = mailbox.exists ?? 0;

        const foundUids = await client.search({ all: true }, { uid: true });
        const uids = Array.isArray(foundUids) ? foundUids : [];
        const latestUids = [...uids]
          .filter((uid): uid is number => Number.isFinite(uid) && uid > 0)
          .sort((a, b) => b - a)
          .slice(0, 5);

        const latestImapMessages: MailDiagnoseFolderMessage[] = [];
        if (latestUids.length > 0) {
          for await (const item of client.fetch(
            latestUids.join(","),
            { uid: true, envelope: true, internalDate: true },
            { uid: true },
          )) {
            if (!item.uid) continue;
            const meta = envelopeFrom(item);
            latestImapMessages.push({
              uid: item.uid,
              subject: meta.subject,
              date: meta.date,
              from: meta.from,
            });
          }
          latestImapMessages.sort((a, b) => b.uid - a.uid);
        }

        const dbFolder = dbFolderByImapName.get(listed.path);
        const dbLastSyncedUid = dbFolder?.lastSyncedUid ?? null;
        const gap = computeGap(imapUidNext, dbLastSyncedUid);

        let dbHasThisUid = false;
        const topUid = latestImapMessages[0]?.uid;
        if (topUid != null && dbFolder) {
          const exists = await db.email.findFirst({
            where: {
              tenantId: account.tenantId,
              accountId: account.id,
              folderId: dbFolder.id,
              uid: topUid,
            },
            select: { id: true },
          });
          dbHasThisUid = Boolean(exists);
        }

        folders.push({
          path: listed.path,
          type: inferFolderType(listed.path),
          imapMessages,
          imapUidNext,
          imapUidValidity,
          dbLastSyncedUid,
          dbUidValidity: dbFolder?.uidValidity != null ? dbFolder.uidValidity.toString() : null,
          gap,
          latestImapMessages,
          dbHasThisUid,
        });
      } finally {
        lock.release();
      }
    }

    folders.sort((a, b) => a.path.localeCompare(b.path));
    return {
      accountId: account.id,
      syncedAt: new Date().toISOString(),
      folders,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
