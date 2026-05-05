#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Переносит уже существующие вложения нарядов в S3.
 *
 * Что делает:
 * - читает `OrderAttachment` (из `data` или из старого `diskRelPath` на диске),
 * - загружает объект в S3 key: `orders/<orderId>/attachments/<attachmentId>`,
 * - обновляет запись: `diskRelPath = "s3:<key>"`, `data = пусто`.
 *
 * Безопасность:
 * - уже перенесенные (`diskRelPath` startsWith "s3:") пропускаются,
 * - есть dry-run режим,
 * - поштучная обработка и итоговая статистика.
 *
 * env:
 * - DATABASE_URL
 * - S3_ENDPOINT
 * - S3_REGION
 * - S3_BUCKET
 * - S3_ACCESS_KEY_ID
 * - S3_SECRET_ACCESS_KEY
 * optional:
 * - S3_FORCE_PATH_STYLE=true|false (default true)
 * - ORDER_ATTACHMENT_STORAGE_DIR (default ./data/order-attachments)
 * - KEEP_DB_DATA=1 (если нужно временно оставить data в БД)
 *
 * args:
 * - --dry-run
 * - --batch=100
 * - --limit=1000
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

function getArg(name, fallback = "") {
  const p = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(p));
  if (!hit) return fallback;
  return hit.slice(p.length);
}

function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function reqEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getStorageRoot() {
  const fromEnv = String(process.env.ORDER_ATTACHMENT_STORAGE_DIR || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "order-attachments");
}

function absFromRel(rel) {
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  return path.join(getStorageRoot(), ...parts);
}

function isS3RelPath(rel) {
  return typeof rel === "string" && rel.startsWith("s3:");
}

function buildS3Key(orderId, attachmentId) {
  return `orders/${orderId}/attachments/${attachmentId}`;
}

async function readAttachmentBytes(row) {
  if (row.diskRelPath && !isS3RelPath(row.diskRelPath)) {
    return fs.readFile(absFromRel(row.diskRelPath));
  }
  const d = row.data;
  if (!d) return Buffer.alloc(0);
  return Buffer.isBuffer(d) ? d : Buffer.from(d);
}

async function main() {
  const databaseUrl = reqEnv("DATABASE_URL");
  const s3Endpoint = reqEnv("S3_ENDPOINT");
  const s3Region = reqEnv("S3_REGION");
  const s3Bucket = reqEnv("S3_BUCKET");
  const s3AccessKeyId = reqEnv("S3_ACCESS_KEY_ID");
  const s3SecretAccessKey = reqEnv("S3_SECRET_ACCESS_KEY");
  const s3ForcePathStyle =
    String(process.env.S3_FORCE_PATH_STYLE || "true").trim().toLowerCase() !==
    "false";

  const dryRun = hasFlag("dry-run");
  const keepDbData = String(process.env.KEEP_DB_DATA || "").trim() === "1";
  const batchSize = Math.max(1, Number.parseInt(getArg("batch", "100"), 10) || 100);
  const limitRaw = Number.parseInt(getArg("limit", "0"), 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 0;

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["error"],
  });
  const s3 = new S3Client({
    region: s3Region,
    endpoint: s3Endpoint,
    forcePathStyle: s3ForcePathStyle,
    credentials: {
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
    },
  });

  let processed = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let cursor = null;

  console.log(
    `[attachments->s3] start; dryRun=${dryRun} batch=${batchSize} limit=${limit || "no-limit"} keepDbData=${keepDbData}`,
  );

  try {
    while (true) {
      if (limit > 0 && processed >= limit) break;

      const rows = await prisma.orderAttachment.findMany({
        where: {
          OR: [{ diskRelPath: null }, { NOT: { diskRelPath: { startsWith: "s3:" } } }],
        },
        orderBy: { id: "asc" },
        take: Math.min(batchSize, limit > 0 ? limit - processed : batchSize),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          orderId: true,
          fileName: true,
          mimeType: true,
          size: true,
          data: true,
          diskRelPath: true,
        },
      });

      if (rows.length === 0) break;

      for (const row of rows) {
        processed += 1;
        cursor = row.id;

        if (row.diskRelPath && isS3RelPath(row.diskRelPath)) {
          skipped += 1;
          continue;
        }

        try {
          const bytes = await readAttachmentBytes(row);
          if (!bytes || bytes.length === 0) {
            throw new Error("empty attachment bytes");
          }
          const key = buildS3Key(row.orderId, row.id);
          if (!dryRun) {
            await s3.send(
              new PutObjectCommand({
                Bucket: s3Bucket,
                Key: key,
                Body: bytes,
                ContentType: row.mimeType || "application/octet-stream",
              }),
            );
            await prisma.orderAttachment.update({
              where: { id: row.id },
              data: {
                diskRelPath: `s3:${key}`,
                data: keepDbData ? row.data : Buffer.alloc(0),
              },
            });
          }
          migrated += 1;
          if (processed % 50 === 0) {
            console.log(
              `[attachments->s3] progress processed=${processed} migrated=${migrated} failed=${failed}`,
            );
          }
        } catch (e) {
          failed += 1;
          console.error(
            `[attachments->s3] failed id=${row.id} order=${row.orderId} file="${row.fileName}"`,
            e instanceof Error ? e.message : e,
          );
        }
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  console.log(
    `[attachments->s3] done processed=${processed} migrated=${migrated} skipped=${skipped} failed=${failed}`,
  );
  if (failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error("[attachments->s3] fatal", e instanceof Error ? e.message : e);
  process.exit(1);
});

