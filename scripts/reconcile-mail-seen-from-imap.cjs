/**
 * One-time deploy repair for CRM read/unread state.
 *
 * Source of truth: Yandex/IMAP \Seen flag.
 * Scope: existing active mail accounts with saved UIDs.
 * Writes: Email.isRead/readAt and folder/label unread counters only.
 */
const { createDecipheriv, createHash } = require("node:crypto");
const { ImapFlow } = require("imapflow");
const { PrismaClient, EmailDirection, EmailFolderType } = require("@prisma/client");

const APPLY = process.argv.includes("--apply") || process.argv.includes("--auto-once");
const AUTO_ONCE = process.argv.includes("--auto-once");
const MARKER_KEY = "mail-seen-reconcile-from-imap-20260522-v1";
const UID_BATCH_SIZE = Number(process.env.MAIL_SEEN_RECONCILE_UID_BATCH || 100);
const ACCOUNT_LIMIT = Number(process.env.MAIL_SEEN_RECONCILE_ACCOUNT_LIMIT || 0);

function decryptAppPassword(encrypted) {
  const [version, iv, tag, body] = String(encrypted || "").split(":");
  if (version !== "mail-v2" || !iv || !tag || !body) {
    throw new Error("Unsupported encrypted mail secret format");
  }
  const secret = process.env.MAIL_CREDENTIALS_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("MAIL_CREDENTIALS_SECRET is required and must be at least 16 characters");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    createHash("sha256").update(secret).digest(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function createImapClient(account) {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    connectionTimeout: Number(process.env.MAIL_IMAP_CONNECTION_TIMEOUT_MS || 120000),
    greetingTimeout: Number(process.env.MAIL_IMAP_GREETING_TIMEOUT_MS || 30000),
    socketTimeout: Number(process.env.MAIL_IMAP_SOCKET_TIMEOUT_MS || 900000),
    auth: {
      user: account.email,
      pass: decryptAppPassword(account.encryptedAppPassword),
    },
    logger: false,
  });
  client.on("error", () => undefined);
  return client;
}

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function hasMarker(prisma) {
  try {
    const marker = await prisma.tenantClientState.findFirst({
      where: { key: MARKER_KEY },
      select: { tenantId: true },
    });
    return marker != null;
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) return false;
    throw err;
  }
}

async function writeMarkers(prisma, summary) {
  let tenantIds = [];
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    tenantIds = tenants.map((tenant) => tenant.id);
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) {
      const rows = await prisma.emailAccount.findMany({ select: { tenantId: true }, distinct: ["tenantId"] });
      tenantIds = rows.map((row) => row.tenantId);
    } else {
      throw err;
    }
  }
  for (const tenantId of tenantIds.filter(Boolean)) {
    await prisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: MARKER_KEY } },
      create: {
        tenantId,
        key: MARKER_KEY,
        value: { ranAt: new Date().toISOString(), summary },
      },
      update: {
        value: { ranAt: new Date().toISOString(), summary },
      },
    });
  }
}

async function refreshFolderCounters(prisma, tenantId, folderId) {
  const [totalCount, unreadCount] = await Promise.all([
    prisma.email.count({ where: { tenantId, folderId } }),
    prisma.email.count({ where: { tenantId, folderId, isRead: false } }),
  ]);
  await prisma.emailFolder.update({ where: { id: folderId }, data: { totalCount, unreadCount } });
}

async function refreshLabelCounters(prisma, tenantId, labelId) {
  const [totalCount, unreadCount] = await Promise.all([
    prisma.emailLabelAssignment.count({ where: { tenantId, labelId } }),
    prisma.emailLabelAssignment.count({ where: { tenantId, labelId, email: { isRead: false } } }),
  ]);
  await prisma.emailLabel.update({ where: { id: labelId }, data: { totalCount, unreadCount } });
}

async function fetchSeenMap(client, folderPath, uids) {
  const seen = new Map();
  if (uids.length === 0) return seen;
  const lock = await client.getMailboxLock(folderPath);
  try {
    for (const batch of chunks(uids, UID_BATCH_SIZE)) {
      for await (const item of client.fetch(batch.join(","), { uid: true, flags: true, internalDate: true }, { uid: true })) {
        if (!item.uid) continue;
        seen.set(item.uid, {
          isRead: item.flags?.has("\\Seen") === true,
          internalDate: item.internalDate instanceof Date ? item.internalDate : item.internalDate ? new Date(item.internalDate) : null,
        });
      }
    }
  } finally {
    lock.release();
  }
  return seen;
}

async function reconcilePath(prisma, account, emails, path, touchedFolders, touchedLabels) {
  const client = createImapClient(account);
  await client.connect();
  try {
    const seen = await fetchSeenMap(client, path, emails.map((email) => email.uid).filter(Boolean));
    let checked = 0;
    let updated = 0;
    for (const email of emails) {
      const state = seen.get(email.uid);
      if (!state) continue;
      checked += 1;
      if (email.isRead === state.isRead) continue;
      updated += 1;
      touchedFolders.add(email.folderId);
      for (const assignment of email.labelAssignments) touchedLabels.add(assignment.labelId);
      if (APPLY) {
        await prisma.email.update({
          where: { id: email.id },
          data: {
            isRead: state.isRead,
            readAt: state.isRead ? state.internalDate || new Date() : null,
          },
        });
      }
    }
    return { checked, updated };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

function pathForEmail(email, inboxPath) {
  if (email.folder?.imapName) return email.folder.imapName;
  if (email.direction === EmailDirection.INBOUND && inboxPath) return inboxPath;
  return email.folder?.imapName || inboxPath || null;
}

async function reconcileAccount(prisma, account) {
  const inbox = account.folders.find((folder) => folder.type === EmailFolderType.INBOX);
  const emails = await prisma.email.findMany({
    where: {
      tenantId: account.tenantId,
      accountId: account.id,
      uid: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      folderId: true,
      uid: true,
      direction: true,
      isRead: true,
      folder: { select: { imapName: true, type: true } },
      labelAssignments: { select: { labelId: true } },
    },
  });
  const byPath = new Map();
  for (const email of emails) {
    const path = pathForEmail(email, inbox?.imapName || null);
    if (!path) continue;
    const bucket = byPath.get(path) || [];
    bucket.push(email);
    byPath.set(path, bucket);
  }
  const touchedFolders = new Set();
  const touchedLabels = new Set();
  let checked = 0;
  let updated = 0;
  for (const [path, bucket] of byPath) {
    try {
      const result = await reconcilePath(prisma, account, bucket, path, touchedFolders, touchedLabels);
      checked += result.checked;
      updated += result.updated;
    } catch (err) {
      console.warn(`[mail-seen] ${account.email}: папка "${path}" пропущена: ${err instanceof Error ? err.message : String(err)}`);
      if (path !== inbox?.imapName && inbox?.imapName) {
        const inboundBucket = bucket.filter((email) => email.direction === EmailDirection.INBOUND);
        if (inboundBucket.length > 0) {
          try {
            const result = await reconcilePath(prisma, account, inboundBucket, inbox.imapName, touchedFolders, touchedLabels);
            checked += result.checked;
            updated += result.updated;
            console.warn(`[mail-seen] ${account.email}: "${path}" сверена через fallback INBOX.`);
          } catch (fallbackErr) {
            console.warn(
              `[mail-seen] ${account.email}: fallback INBOX для "${path}" не удался: ${
                fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
              }`,
            );
          }
        }
      }
    }
  }
  if (APPLY) {
    for (const folderId of [...touchedFolders].filter(Boolean)) {
      await refreshFolderCounters(prisma, account.tenantId, folderId);
    }
    for (const labelId of [...touchedLabels].filter(Boolean)) {
      await refreshLabelCounters(prisma, account.tenantId, labelId);
    }
  }
  return { checked, updated, foldersTouched: touchedFolders.size, labelsTouched: touchedLabels.size };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (AUTO_ONCE && (await hasMarker(prisma))) {
      console.log("[mail-seen] already reconciled; skip.");
      return;
    }
    const accounts = await prisma.emailAccount.findMany({
      where: { isActive: true, encryptedAppPassword: { not: null } },
      orderBy: [{ tenantId: "asc" }, { email: "asc" }],
      ...(ACCOUNT_LIMIT > 0 ? { take: ACCOUNT_LIMIT } : {}),
      include: { folders: true },
    });
    const summary = { accounts: 0, checked: 0, updated: 0, foldersTouched: 0, labelsTouched: 0, dryRun: !APPLY };
    for (const account of accounts) {
      console.log(`[mail-seen] reconcile ${account.email}`);
      const result = await reconcileAccount(prisma, account);
      summary.accounts += 1;
      summary.checked += result.checked;
      summary.updated += result.updated;
      summary.foldersTouched += result.foldersTouched;
      summary.labelsTouched += result.labelsTouched;
      console.log(`[mail-seen] ${account.email}: checked=${result.checked}, updated=${result.updated}`);
    }
    if (AUTO_ONCE && APPLY) await writeMarkers(prisma, summary);
    console.log(`[mail-seen] done: ${JSON.stringify(summary)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[mail-seen] failed:", err);
  process.exit(1);
});
