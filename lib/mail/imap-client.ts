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

export type ImapMessageSummary = {
  uid: number;
  subject: string | null;
  from: string | null;
  internalDate: Date | null;
};

export function recentWindowStartUid(
  requestedStartUid: number,
  uidNext: number | undefined,
  maxMessages: number,
): number {
  const startUid = Math.max(1, requestedStartUid);
  if (!uidNext || uidNext <= 1 || maxMessages <= 0) return startUid;
  return startUid;
}

function envTimeoutMs(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function createImapClient(account: MailConnectionAccount): ImapFlow {
  if (!account.encryptedAppPassword) {
    throw new Error("MAIL_ACCOUNT_PASSWORD_NOT_CONFIGURED");
  }
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    connectionTimeout: envTimeoutMs("MAIL_IMAP_CONNECTION_TIMEOUT_MS", 120_000),
    greetingTimeout: envTimeoutMs("MAIL_IMAP_GREETING_TIMEOUT_MS", 30_000),
    socketTimeout: envTimeoutMs("MAIL_IMAP_SOCKET_TIMEOUT_MS", 15 * 60_000),
    auth: {
      user: account.email,
      pass: decryptAppPassword(account.encryptedAppPassword),
    },
    logger: false,
  });
  // ImapFlow emits socket timeouts as "error" events. Without a listener Node
  // treats them as uncaught exceptions even when the active command is handled.
  client.on("error", () => undefined);
  return client;
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
  maxMessages: number,
): AsyncGenerator<ImapFetchedMessage> {
  const lock = await client.getMailboxLock(folderPath);
  try {
    const effectiveStartUid = recentWindowStartUid(
      startUid,
      client.mailbox ? client.mailbox.uidNext : undefined,
      maxMessages,
    );
    for await (const item of client.fetch(
      `${effectiveStartUid}:*`,
      { uid: true, flags: true, internalDate: true, source: true },
      { uid: true },
    )) {
      if (!item.uid || item.uid < effectiveStartUid || !item.source) continue;
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

export async function* fetchFolderMessagesSince(
  client: ImapFlow,
  folderPath: string,
  sinceDate: Date,
  maxMessages: number,
): AsyncGenerator<ImapFetchedMessage> {
  const lock = await client.getMailboxLock(folderPath);
  try {
    if (maxMessages <= 0) return;
    const foundUids = await client.search({ since: sinceDate }, { uid: true });
    const uids = Array.isArray(foundUids) ? foundUids : [];
    const limitedUids = [...uids]
      .filter((uid): uid is number => Number.isFinite(uid) && uid > 0)
      .sort((a, b) => a - b)
      .slice(-maxMessages);
    if (limitedUids.length === 0) return;
    for await (const item of client.fetch(
      limitedUids.join(","),
      { uid: true, flags: true, internalDate: true, source: true },
      { uid: true },
    )) {
      if (!item.uid || !item.source) continue;
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

export async function* fetchFolderMessagesBefore(
  client: ImapFlow,
  folderPath: string,
  beforeUid: number | null | undefined,
  maxMessages: number,
): AsyncGenerator<ImapFetchedMessage> {
  const lock = await client.getMailboxLock(folderPath);
  try {
    const uidNext = client.mailbox ? client.mailbox.uidNext : undefined;
    const endUid = Math.max(0, (beforeUid && beforeUid > 1 ? beforeUid : uidNext ?? 1) - 1);
    if (endUid < 1 || maxMessages <= 0) return;
    const startUid = Math.max(1, endUid - maxMessages + 1);
    for await (const item of client.fetch(
      `${startUid}:${endUid}`,
      { uid: true, flags: true, internalDate: true, source: true },
      { uid: true },
    )) {
      if (!item.uid || item.uid < startUid || item.uid > endUid || !item.source) continue;
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

export async function fetchFolderMessageSummariesBefore(
  client: ImapFlow,
  folderPath: string,
  maxMessages: number,
): Promise<ImapMessageSummary[]> {
  const lock = await client.getMailboxLock(folderPath);
  try {
    const uidNext = client.mailbox ? client.mailbox.uidNext : undefined;
    const endUid = Math.max(0, (uidNext ?? 1) - 1);
    if (endUid < 1 || maxMessages <= 0) return [];
    const startUid = Math.max(1, endUid - maxMessages + 1);
    const summaries: ImapMessageSummary[] = [];
    for await (const item of client.fetch(
      `${startUid}:${endUid}`,
      { uid: true, envelope: true, internalDate: true },
      { uid: true },
    )) {
      if (!item.uid) continue;
      const envelope = item.envelope as {
        subject?: unknown;
        from?: Array<{ name?: unknown; address?: unknown }>;
      } | undefined;
      const [from] = Array.isArray(envelope?.from) ? envelope.from : [];
      summaries.push({
        uid: item.uid,
        subject: typeof envelope?.subject === "string" ? envelope.subject : null,
        from: [from?.name, from?.address].filter((value) => typeof value === "string" && value).join(" ") || null,
        internalDate:
          item.internalDate instanceof Date
            ? item.internalDate
            : item.internalDate
              ? new Date(item.internalDate)
              : null,
      });
    }
    return summaries.sort((a, b) => b.uid - a.uid);
  } finally {
    lock.release();
  }
}

export async function replaceImapClientIfNeeded(
  account: MailConnectionAccount,
  client: ImapFlow,
): Promise<ImapFlow> {
  if (client.usable) return client;
  await client.logout().catch(() => undefined);
  const next = createImapClient(account);
  await next.connect();
  return next;
}

/** Пометить \\Seen через уже открытую sync-сессию (не открывает второе IMAP-подключение). */
export async function setMessageSeenOnClient(
  client: ImapFlow,
  folderPath: string,
  uid: number,
  seen: boolean,
): Promise<void> {
  if (!Number.isFinite(uid) || uid <= 0) return;
  if (!client.usable) {
    throw new Error("IMAP connection not available for markRead");
  }
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
}

export async function setMessageSeen(
  account: MailConnectionAccount,
  folderPath: string,
  uid: number,
  seen: boolean,
): Promise<void> {
  await setMessagesSeen(account, folderPath, [uid], seen);
}

export async function setMessagesSeen(
  account: MailConnectionAccount,
  folderPath: string,
  uids: number[],
  seen: boolean,
): Promise<void> {
  const validUids = [...new Set(uids.filter((uid) => Number.isFinite(uid) && uid > 0))];
  if (validUids.length === 0) return;
  const client = createImapClient(account);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      for (let index = 0; index < validUids.length; index += 100) {
        const batch = validUids.slice(index, index + 100).join(",");
        if (seen) {
          await client.messageFlagsAdd(batch, ["\\Seen"], { uid: true });
        } else {
          await client.messageFlagsRemove(batch, ["\\Seen"], { uid: true });
        }
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

export async function moveMessage(
  account: MailConnectionAccount,
  sourceFolderPath: string,
  uid: number,
  destinationFolderPath: string,
): Promise<number | null> {
  const client = createImapClient(account);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(sourceFolderPath);
    try {
      const result = await client.messageMove(String(uid), destinationFolderPath, { uid: true });
      return result ? result.uidMap?.get(uid) ?? null : null;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function deleteMessage(
  account: MailConnectionAccount,
  folderPath: string,
  uid: number,
): Promise<void> {
  const client = createImapClient(account);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}
