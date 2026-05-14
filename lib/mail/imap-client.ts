import "server-only";
import { ImapFlow } from "imapflow";
import type { EmailAccount } from "@prisma/client";
import { decryptAppPassword } from "@/lib/mail/encryption";

export type MailConnectionAccount = Pick<
  EmailAccount,
  | "email"
  | "encryptedAppPassword"
  | "imapHost"
  | "imapPort"
  | "imapSecure"
>;

export type ImapFolderInfo = {
  path: string;
  name: string;
  delimiter: string | null;
  listed: unknown;
};

export type ImapFetchedMessage = {
  uid: number;
  flags: Set<string>;
  internalDate: Date | null;
  source: Buffer;
};

export function createImapClient(account: MailConnectionAccount): ImapFlow {
  if (!account.encryptedAppPassword) {
    throw new Error("MAIL_ACCOUNT_PASSWORD_NOT_CONFIGURED");
  }
  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: {
      user: account.email,
      pass: decryptAppPassword(account.encryptedAppPassword),
    },
    logger: false,
  });
}

export async function testImapConnection(account: MailConnectionAccount): Promise<void> {
  const client = createImapClient(account);
  await client.connect();
  try {
    await client.noop();
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function listImapFolders(client: ImapFlow): Promise<ImapFolderInfo[]> {
  const boxes = await client.list();
  return boxes.map((box) => ({
    path: box.path,
    name: box.name,
    delimiter: box.delimiter ?? null,
    listed: box,
  }));
}

export async function* fetchFolderMessages(
  client: ImapFlow,
  folderPath: string,
  startUid: number,
): AsyncGenerator<ImapFetchedMessage> {
  const lock = await client.getMailboxLock(folderPath);
  try {
    for await (const item of client.fetch(
      `${Math.max(1, startUid)}:*`,
      { uid: true, flags: true, internalDate: true, source: true },
      { uid: true },
    )) {
      if (!item.uid || item.uid < startUid || !item.source) continue;
      yield {
        uid: item.uid,
        flags: item.flags ?? new Set<string>(),
        internalDate:
          item.internalDate instanceof Date
            ? item.internalDate
            : item.internalDate
              ? new Date(item.internalDate)
              : null,
        source: Buffer.isBuffer(item.source) ? item.source : Buffer.from(item.source),
      };
    }
  } finally {
    lock.release();
  }
}

export async function setMessageSeen(
  account: MailConnectionAccount,
  folderPath: string,
  uid: number,
  seen: boolean,
): Promise<void> {
  const client = createImapClient(account);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      if (seen) {
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function setMessageFlagged(
  account: MailConnectionAccount,
  folderPath: string,
  uid: number,
  flagged: boolean,
): Promise<void> {
  const client = createImapClient(account);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      if (flagged) {
        await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}
