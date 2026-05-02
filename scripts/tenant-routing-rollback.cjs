#!/usr/bin/env node
/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const controlUrl = String(process.env.DATABASE_URL || "").trim();
  const tenantSlug = String(process.env.TENANT_SLUG || "").trim();
  if (!controlUrl || !tenantSlug) {
    throw new Error("Use DATABASE_URL and TENANT_SLUG env vars");
  }
  const prisma = new PrismaClient({ datasources: { db: { url: controlUrl } } });
  try {
    await prisma.tenant.update({
      where: { slug: tenantSlug },
      data: {
        tenantDatabaseEnabled: false,
        tenantDatabaseReadyAt: null,
      },
    });
    console.log(`Tenant ${tenantSlug} switched back to shared DB mode.`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
