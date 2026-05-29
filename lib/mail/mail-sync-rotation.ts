import "server-only";

import type { PrismaClient } from "@prisma/client";
import { EmailFolderType } from "@prisma/client";
import type { ImapFolderInfo } from "@/lib/mail/imap-client";
import { logger } from "@/lib/server/logger";

function inferFolderType(path: string): EmailFolderType {
  const p = path.trim().toLowerCase();
  if (p === "inbox" || p.includes("входящ")) return EmailFolderType.INBOX;
  if (p === "sent" || p.includes("отправлен")) return EmailFolderType.SENT;
  if (p.includes("draft") || p.includes("чернов")) return EmailFolderType.DRAFTS;
  if (p.includes("spam") || p.includes("спам")) return EmailFolderType.SPAM;
  if (p.includes("trash") || p.includes("deleted") || p.includes("корз")) {
    return EmailFolderType.TRASH;
  }
  if (p.includes("archive") || p.includes("архив")) return EmailFolderType.ARCHIVE;
  return EmailFolderType.CUSTOM;
}

/** Сколько пользовательских IMAP-папок опрашиваем за один фоновый запуск RECENT. */
export const RECENT_CUSTOM_FOLDERS_PER_JOB = 12;

export type MailCustomSyncCursor = { offset: number };

export function customSyncCursorKey(accountId: string): string {
  return `mail:customSyncCursor:${accountId}`;
}

export async function readCustomSyncCursor(
  db: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<number> {
  try {
    const row = await db.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: customSyncCursorKey(accountId) } },
      select: { value: true },
    });
    const value = row?.value;
    if (
      value &&
      typeof value === "object" &&
      "offset" in value &&
      typeof (value as MailCustomSyncCursor).offset === "number"
    ) {
      return Math.max(0, Math.floor((value as MailCustomSyncCursor).offset));
    }
  } catch (err) {
    logger.warn({ err, tenantId, accountId }, "mail custom sync cursor read failed");
  }
  return 0;
}

export async function writeCustomSyncCursor(
  db: PrismaClient,
  tenantId: string,
  accountId: string,
  offset: number,
): Promise<void> {
  try {
    const normalized = Math.max(0, Math.floor(offset));
    await db.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: customSyncCursorKey(accountId) } },
      create: { tenantId, key: customSyncCursorKey(accountId), value: { offset: normalized } },
      update: { value: { offset: normalized } },
    });
  } catch (err) {
    logger.warn({ err, tenantId, accountId, offset }, "mail custom sync cursor write failed");
  }
}

export type RecentFolderSyncPlan = {
  messageSyncPaths: Set<string>;
  customFolderTotal: number;
  customFoldersThisRun: number;
  nextCustomOffset: number;
  hasMoreCustomFolders: boolean;
};

export function planRecentFolderSync(
  listedFolders: ImapFolderInfo[],
  customOffset: number,
): RecentFolderSyncPlan {
  const customFolders = listedFolders.filter(
    (folder) => inferFolderType(folder.path) === EmailFolderType.CUSTOM,
  );
  const alwaysPaths = listedFolders
    .filter((folder) => {
      const type = inferFolderType(folder.path);
      return type === EmailFolderType.INBOX || type === EmailFolderType.SENT;
    })
    .map((folder) => folder.path);

  const customTotal = customFolders.length;
  if (customTotal === 0) {
    return {
      messageSyncPaths: new Set(alwaysPaths),
      customFolderTotal: 0,
      customFoldersThisRun: 0,
      nextCustomOffset: 0,
      hasMoreCustomFolders: false,
    };
  }

  const start = Math.min(Math.max(0, customOffset), customTotal);
  const end = Math.min(start + RECENT_CUSTOM_FOLDERS_PER_JOB, customTotal);
  const customSlice = customFolders.slice(start, end);
  const nextCustomOffset = end >= customTotal ? 0 : end;

  return {
    messageSyncPaths: new Set([...alwaysPaths, ...customSlice.map((folder) => folder.path)]),
    customFolderTotal: customTotal,
    customFoldersThisRun: customSlice.length,
    nextCustomOffset,
    hasMoreCustomFolders: nextCustomOffset !== 0,
  };
}
