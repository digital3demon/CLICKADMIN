import "server-only";
import { EmailFolderType, UserRole, type PrismaClient } from "@prisma/client";
import { evaluateIncomingRules } from "@/lib/mail/mail-sync.service";
import { ensureOrderDigitaldemonRules } from "@/lib/mail/order-digitaldemon-rules";

const ACCOUNT_EMAIL = "order@digitaldemon.studio";
const BATCH_SIZE = 200;

function normalizeUserRole(role: string): UserRole | null {
  return (Object.values(UserRole) as string[]).includes(role) ? (role as UserRole) : null;
}

type ExistingEmailForRules = Awaited<ReturnType<PrismaClient["email"]["findMany"]>>[number] & {
  attachments: Array<{ fileName: string }>;
};

function addressJsonText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as { name?: unknown; address?: unknown };
      return [row.name, row.address].filter(Boolean).join(" ");
    })
    .join(" ");
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function withoutFolderMove<T extends Record<string, unknown>>(data: T): Omit<T, "folderId"> {
  const { folderId: _folderId, ...rest } = data;
  return rest;
}

async function refreshFolderCounters(db: PrismaClient, tenantId: string, folderId: string): Promise<void> {
  const [totalCount, unreadCount] = await Promise.all([
    db.email.count({ where: { tenantId, folderId } }),
    db.email.count({ where: { tenantId, folderId, isRead: false } }),
  ]);
  await db.emailFolder.update({ where: { id: folderId }, data: { totalCount, unreadCount } });
}

async function refreshLabelCounters(db: PrismaClient, tenantId: string, labelId: string): Promise<void> {
  const [totalCount, unreadCount] = await Promise.all([
    db.emailLabelAssignment.count({ where: { tenantId, labelId } }),
    db.emailLabelAssignment.count({ where: { tenantId, labelId, email: { isRead: false } } }),
  ]);
  await db.emailLabel.update({ where: { id: labelId }, data: { totalCount, unreadCount } });
}

export async function applyOrderDigitaldemonRulesToExistingEmails(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  role: string,
  accountId: string,
): Promise<{ processed: number; updated: number; labelsTouched: number; foldersTouched: number; skipped: boolean }> {
  const normalizedRole = normalizeUserRole(role);
  const account = await db.emailAccount.findFirst({
    where: {
      id: accountId,
      tenantId,
      OR: [
        { createdByUserId: userId },
        ...(normalizedRole ? [{ allowedRoles: { has: normalizedRole } }] : []),
      ],
    },
  });
  if (!account || account.email.toLowerCase() !== ACCOUNT_EMAIL) {
    return { processed: 0, updated: 0, labelsTouched: 0, foldersTouched: 0, skipped: true };
  }

  await ensureOrderDigitaldemonRules(db, account);
  const rules = await db.emailRule.findMany({
    where: { tenantId, accountId: account.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const trash = await db.emailFolder.findFirst({
    where: { tenantId, accountId: account.id, type: EmailFolderType.TRASH },
    select: { id: true },
  });
  const [labels, folders] = await Promise.all([
    db.emailLabel.findMany({ where: { tenantId, accountId: account.id }, select: { id: true } }),
    db.emailFolder.findMany({ where: { tenantId, accountId: account.id }, select: { id: true } }),
  ]);
  const validLabelIds = new Set(labels.map((label) => label.id));
  const validFolderIds = new Set(folders.map((folder) => folder.id));
  const touchedLabels = new Set<string>();
  const touchedFolders = new Set<string>();

  let cursor: string | null = null;
  let processed = 0;
  let updated = 0;
  for (;;) {
    const emails: ExistingEmailForRules[] = await db.email.findMany({
      where: { tenantId, accountId: account.id },
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: BATCH_SIZE,
      include: { attachments: { select: { fileName: true } } },
    });
    if (emails.length === 0) break;

    for (const email of emails) {
      const result = evaluateIncomingRules(rules, {
        from: [email.fromName, email.fromAddress].filter(Boolean).join(" "),
        toCc: [addressJsonText(email.to), addressJsonText(email.cc)].filter(Boolean).join(" "),
        subject: email.subject || "",
        body: [email.textBody, email.preview].filter(Boolean).join(" "),
        attachmentNames: email.attachments.map((attachment) => attachment.fileName || "attachment"),
      });
      const labelIds = result.labelIds.filter((id) => validLabelIds.has(id));
      const nextFolderId = result.shouldDelete
        ? trash?.id || result.folderId
        : result.folderId && validFolderIds.has(result.folderId)
          ? result.folderId
          : null;

      if (labelIds.length === 0 && !nextFolderId && !result.isRead && !result.isFlagged) {
        processed += 1;
        continue;
      }

      for (const labelId of labelIds) {
        await db.emailLabelAssignment.upsert({
          where: { emailId_labelId: { emailId: email.id, labelId } },
          create: { tenantId, emailId: email.id, labelId },
          update: {},
        });
        touchedLabels.add(labelId);
      }

      let data: Record<string, unknown> = {};
      if (nextFolderId && nextFolderId !== email.folderId) data.folderId = nextFolderId;
      if (result.isRead && !email.isRead) {
        data.isRead = true;
        data.readAt = new Date();
      }
      if (result.isFlagged && !email.isFlagged) data.isFlagged = true;

      if (Object.keys(data).length > 0) {
        const requestedFolderId = typeof data.folderId === "string" ? data.folderId : null;
        try {
          await db.email.update({ where: { id: email.id }, data });
        } catch (error) {
          if (!requestedFolderId || !isUniqueConstraintError(error)) throw error;
          data = withoutFolderMove(data);
          if (Object.keys(data).length > 0) {
            await db.email.update({ where: { id: email.id }, data });
          }
        }
        if (Object.keys(data).length > 0) updated += 1;
        if (email.folderId) touchedFolders.add(email.folderId);
        if (requestedFolderId && data.folderId) touchedFolders.add(requestedFolderId);
      }
      processed += 1;
    }
    cursor = emails.at(-1)?.id ?? null;
  }

  for (const folderId of touchedFolders) await refreshFolderCounters(db, tenantId, folderId);
  for (const labelId of touchedLabels) await refreshLabelCounters(db, tenantId, labelId);

  return {
    processed,
    updated,
    labelsTouched: touchedLabels.size,
    foldersTouched: touchedFolders.size,
    skipped: false,
  };
}
