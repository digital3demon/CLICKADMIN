/**
 * Полный сброс CRM-копии почты: письма, вложения, папки, метки, правила и sync jobs.
 * Удаляет и сами EmailAccount: после сброса ящики подключаются заново через интерфейс CRM.
 *
 * По умолчанию dry-run. Реальное удаление требует:
 *   RESET_MAIL_ACCOUNTS_CONFIRM=DELETE_ALL_MAIL node --env-file=.env scripts/reset-mail-accounts.cjs --apply
 *
 * Автодеплой-режим:
 *   node scripts/reset-mail-accounts.cjs --auto-once
 * Выполнится один раз на БД и поставит marker в TenantClientState.
 *
 * Яндекс.Почта не затрагивается. S3-вложения не удаляются; локальные файлы удаляются, если не указан --keep-files.
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const APPLY = process.argv.includes("--apply");
const AUTO_ONCE = process.argv.includes("--auto-once");
const DELETE_FILES = !process.argv.includes("--keep-files");
const DELETE_ACCOUNTS = true;
const CONFIRM = AUTO_ONCE || process.env.RESET_MAIL_ACCOUNTS_CONFIRM === "DELETE_ALL_MAIL";
const ONCE_MARKER_KEY = "mail-reset-accounts-20260521-v1";

const RESET_TABLES = [
  "EmailAttachment",
  "EmailLabelAssignment",
  "EmailSyncJob",
  "EmailRule",
  "Email",
  "EmailFolder",
  "EmailLabel",
];
const ACCOUNT_TABLES = [
  "EmailAccount",
];
const ALL_TABLES = [...RESET_TABLES, ...ACCOUNT_TABLES];

function isPostgres(url) {
  const value = String(url || "").trim().toLowerCase();
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

function isSqlite(url) {
  return String(url || "").trim().toLowerCase().startsWith("file:");
}

function getMailAttachmentStorageRoot() {
  const fromEnv = process.env.MAIL_ATTACHMENT_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "mail-attachments");
}

function absoluteMailAttachmentPath(rel) {
  const parts = String(rel || "").replace(/\\/g, "/").split("/").filter(Boolean);
  return path.join(getMailAttachmentStorageRoot(), ...parts);
}

async function deleteLocalAttachment(rel) {
  if (!rel || String(rel).startsWith("s3:")) return false;
  try {
    await fs.unlink(absoluteMailAttachmentPath(rel));
    return true;
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return false;
    throw err;
  }
}

async function safeCount(prisma, modelName) {
  try {
    const key = modelName[0].toLowerCase() + modelName.slice(1);
    return await prisma[key].count();
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) {
      return null;
    }
    throw err;
  }
}

async function collectAttachmentPaths(prisma) {
  try {
    return await prisma.emailAttachment.findMany({
      where: { diskRelPath: { not: null } },
      select: { diskRelPath: true },
    });
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) {
      return [];
    }
    throw err;
  }
}

async function resetPostgres(prisma) {
  const tables = DELETE_ACCOUNTS ? ALL_TABLES : RESET_TABLES;
  const quoted = tables.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} CASCADE`);
}

async function resetSqlite(prisma) {
  const ops = [
      prisma.emailAttachment.deleteMany({}),
      prisma.emailLabelAssignment.deleteMany({}),
      prisma.emailSyncJob.deleteMany({}),
      prisma.emailRule.deleteMany({}),
      prisma.email.deleteMany({}),
      prisma.emailFolder.deleteMany({}),
      prisma.emailLabel.deleteMany({}),
  ];
  if (DELETE_ACCOUNTS) ops.push(prisma.emailAccount.deleteMany({}));
  await prisma.$transaction(
    ops,
    { timeout: 180_000 },
  );
}

async function hasAutoOnceMarker(prisma) {
  try {
    const marker = await prisma.tenantClientState.findFirst({
      where: { key: ONCE_MARKER_KEY },
      select: { tenantId: true },
    });
    return marker != null;
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) {
      return false;
    }
    throw err;
  }
}

async function writeAutoOnceMarker(prisma, summary) {
  let tenants = [];
  try {
    tenants = await prisma.tenant.findMany({ select: { id: true } });
  } catch (err) {
    if (!err || typeof err !== "object" || (err.code !== "P2021" && err.code !== "P2022")) throw err;
  }
  const tenantIds = tenants.map((tenant) => tenant.id).filter(Boolean);
  if (tenantIds.length === 0) return;
  for (const tenantId of tenantIds) {
    await prisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: ONCE_MARKER_KEY } },
      create: {
        tenantId,
        key: ONCE_MARKER_KEY,
        value: {
          ranAt: new Date().toISOString(),
          summary,
        },
      },
      update: {
        value: {
          ranAt: new Date().toISOString(),
          summary,
        },
      },
    });
  }
}

async function dedupePreservedAccounts(prisma) {
  if (DELETE_ACCOUNTS) return { kept: 0, disabled: 0 };
  const accounts = await prisma.emailAccount.findMany({
    orderBy: [{ tenantId: "asc" }, { email: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      tenantId: true,
      email: true,
      isActive: true,
      encryptedAppPassword: true,
      createdAt: true,
    },
  });
  const byKey = new Map();
  for (const account of accounts) {
    const key = `${account.tenantId}:${account.email.trim().toLowerCase()}`;
    const bucket = byKey.get(key) || [];
    bucket.push(account);
    byKey.set(key, bucket);
  }

  let kept = 0;
  let disabled = 0;
  for (const bucket of byKey.values()) {
    bucket.sort((a, b) => {
      const aScore = (a.isActive ? 4 : 0) + (a.encryptedAppPassword ? 2 : 0);
      const bScore = (b.isActive ? 4 : 0) + (b.encryptedAppPassword ? 2 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const keep = bucket[0];
    if (!keep) continue;
    kept += 1;
    await prisma.emailAccount.update({
      where: { id: keep.id },
      data: {
        isActive: true,
        lastSyncAt: null,
        lastSyncError: null,
      },
    });
    const duplicateIds = bucket.slice(1).map((account) => account.id);
    if (duplicateIds.length > 0) {
      const res = await prisma.emailAccount.updateMany({
        where: { id: { in: duplicateIds } },
        data: {
          isActive: false,
          lastSyncError: null,
        },
      });
      disabled += res.count;
    }
  }
  return { kept, disabled };
}

async function main() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL не задан");
  }
  if (!isPostgres(databaseUrl) && !isSqlite(databaseUrl)) {
    throw new Error("DATABASE_URL должен быть postgresql://, postgres:// или file:");
  }

  const prisma = new PrismaClient();
  try {
    if (AUTO_ONCE && await hasAutoOnceMarker(prisma)) {
      console.log(`[mail-reset] auto-once marker ${ONCE_MARKER_KEY} уже есть, пропуск.`);
      return;
    }

    const counts = {};
    for (const table of ALL_TABLES) {
      counts[table] = await safeCount(prisma, table);
    }
    const attachmentPaths = await collectAttachmentPaths(prisma);

    const resetTables = DELETE_ACCOUNTS ? ALL_TABLES : RESET_TABLES;
    console.log("[mail-reset] Будут очищены таблицы:", resetTables.join(", "));
    console.log("[mail-reset] EmailAccount тоже будет очищен: доступы к ящикам нужно будет подключить заново.");
    console.log("[mail-reset] Текущие количества:", JSON.stringify(counts, null, 2));
    console.log(`[mail-reset] Файлов вложений в БД: ${attachmentPaths.length}`);

    if (!APPLY) {
      console.log("[mail-reset] DRY-RUN: добавьте --apply и RESET_MAIL_ACCOUNTS_CONFIRM=DELETE_ALL_MAIL для удаления.");
      return;
    }
    if (!CONFIRM) {
      throw new Error("Для удаления задайте RESET_MAIL_ACCOUNTS_CONFIRM=DELETE_ALL_MAIL");
    }

    if (isPostgres(databaseUrl)) {
      await resetPostgres(prisma);
    } else {
      await resetSqlite(prisma);
    }
    const accountSummary = { kept: 0, disabled: 0 };

    let deletedFiles = 0;
    if (DELETE_FILES) {
      for (const row of attachmentPaths) {
        if (await deleteLocalAttachment(row.diskRelPath)) deletedFiles += 1;
      }
    }

    const summary = {
      before: counts,
      attachmentsSeen: attachmentPaths.length,
      deletedFiles,
      deleteAccounts: true,
      accountSummary,
    };
    if (AUTO_ONCE) {
      await writeAutoOnceMarker(prisma, summary);
      console.log(`[mail-reset] auto-once marker записан: ${ONCE_MARKER_KEY}`);
    }

    console.log("[mail-reset] CRM-данные почты очищены.");
    console.log("[mail-reset] Почтовые аккаунты удалены из CRM.");
    console.log(
      DELETE_FILES
        ? `[mail-reset] Локальных файлов вложений удалено: ${deletedFiles}`
        : "[mail-reset] Файлы вложений не удалялись (--keep-files).",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
