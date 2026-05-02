#!/usr/bin/env node
/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

function req(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const controlUrl = req("DATABASE_URL");
  const tenantSlug =
    String(process.env.TENANT_SLUG || "").trim() ||
    String(process.env.CRM_DEFAULT_TENANT_SLUG || "").trim();
  if (!tenantSlug) throw new Error("Missing env TENANT_SLUG or CRM_DEFAULT_TENANT_SLUG");
  const tenantDatabaseUrl = req("TENANT_DATABASE_URL");
  const tenantName = String(process.env.TENANT_NAME || tenantSlug).trim();
  const activate = process.env.ACTIVATE === "1";

  const control = new PrismaClient({ datasources: { db: { url: controlUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: tenantDatabaseUrl } } });
  try {
    await target.$queryRawUnsafe("SELECT 1");
    const row = await control.tenant.upsert({
      where: { slug: tenantSlug },
      create: {
        slug: tenantSlug,
        name: tenantName,
        tenantDatabaseUrl,
        tenantDatabaseEnabled: activate,
        tenantDatabaseReadyAt: activate ? new Date() : null,
      },
      update: {
        name: tenantName,
        tenantDatabaseUrl,
        tenantDatabaseEnabled: activate,
        tenantDatabaseReadyAt: activate ? new Date() : null,
      },
      select: { id: true, slug: true, tenantDatabaseEnabled: true },
    });
    console.log({ ok: true, tenant: row });
  } finally {
    await control.$disconnect().catch(() => undefined);
    await target.$disconnect().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
