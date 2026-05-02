#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Перенос текущего (единственного) тенанта в отдельную БД.
 * Предполагает, что сейчас в control БД данные только одного tenant.
 *
 * env:
 * - DATABASE_URL (control-plane db)
 * - TARGET_TENANT_DB_URL (новая tenant db)
 * - TENANT_SLUG (какой tenant переключать)
 * optional:
 * - DRY_RUN=1
 */

const { execSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

function req(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function sh(command, extraEnv = {}) {
  execSync(command, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

async function main() {
  const controlUrl = req("DATABASE_URL");
  const targetUrl = req("TARGET_TENANT_DB_URL");
  const tenantSlug = req("TENANT_SLUG");
  const dryRun = process.env.DRY_RUN === "1";

  const prisma = new PrismaClient({
    datasources: { db: { url: controlUrl } },
    log: ["error"],
  });
  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
    log: ["error"],
  });
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, tenantDatabaseEnabled: true },
    });
    if (!tenant) throw new Error(`Tenant not found by slug: ${tenantSlug}`);

    console.log(`Tenant: ${tenant.slug} (${tenant.id})`);
    if (dryRun) {
      console.log("DRY_RUN=1: пропускаю dump/restore и update Tenant.");
      return;
    }

    console.log("1) Применяю миграции в target tenant DB...");
    sh(`npx prisma migrate deploy`, { DATABASE_URL: targetUrl });

    console.log("2) Копирую данные из control DB в target DB...");
    sh(
      `pg_dump "${controlUrl}" --data-only --inserts --no-owner --no-privileges | psql "${targetUrl}"`,
    );

    console.log("2.1) Проверяю контрольные counts...");
    const sourceCounts = {
      clinics: await prisma.clinic.count({ where: { tenantId: tenant.id } }),
      doctors: await prisma.doctor.count({ where: { tenantId: tenant.id } }),
      orders: await prisma.order.count({ where: { tenantId: tenant.id } }),
    };
    const targetCounts = {
      clinics: await targetPrisma.clinic.count({ where: { tenantId: tenant.id } }),
      doctors: await targetPrisma.doctor.count({ where: { tenantId: tenant.id } }),
      orders: await targetPrisma.order.count({ where: { tenantId: tenant.id } }),
    };
    console.log({ sourceCounts, targetCounts });
    if (
      sourceCounts.clinics !== targetCounts.clinics ||
      sourceCounts.doctors !== targetCounts.doctors ||
      sourceCounts.orders !== targetCounts.orders
    ) {
      throw new Error("Count validation failed: source and target differ");
    }

    console.log("3) Включаю routing на выделенную tenant DB...");
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        tenantDatabaseUrl: targetUrl,
        tenantDatabaseEnabled: true,
        tenantDatabaseReadyAt: new Date(),
      },
    });
    console.log("Done.");
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await targetPrisma.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
