const { PrismaClient } = require("@prisma/client");

function augmentSqliteDatasourceUrl(url) {
  const raw = String(url || "").trim();
  if (!raw.toLowerCase().startsWith("file:")) return raw;
  const [pathPart, queryRaw = ""] = raw.split("?");
  const params = new URLSearchParams(queryRaw);
  if (!params.has("connection_limit")) params.set("connection_limit", "5");
  if (!params.has("socket_timeout")) params.set("socket_timeout", "600");
  return `${pathPart}?${params.toString()}`;
}

function tenantClient(dbUrl) {
  return new PrismaClient({
    datasources: { db: { url: augmentSqliteDatasourceUrl(dbUrl) } },
    transactionOptions: { maxWait: 30000, timeout: 180000 },
  });
}

async function tryFindAccount(prisma, email) {
  try {
    return await prisma.emailAccount.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    if (err && typeof err === "object" && err.code === "P2021") return null;
    throw err;
  }
}

async function findMailAccountClient(email) {
  const control = new PrismaClient();
  const clients = [control];
  const wantedSlug =
    process.env.TENANT_SLUG?.trim() ||
    process.env.CRM_DEFAULT_TENANT_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG?.trim() ||
    "";

  async function done(prisma, account, label) {
    return {
      prisma,
      account,
      label,
      async disconnect() {
        await Promise.allSettled(clients.map((client) => client.$disconnect()));
      },
    };
  }

  const shared = await tryFindAccount(control, email);
  if (shared) return done(control, shared, "shared");

  const envTenantUrl = process.env.TENANT_DATABASE_URL?.trim();
  if (envTenantUrl) {
    const prisma = tenantClient(envTenantUrl);
    clients.push(prisma);
    const account = await tryFindAccount(prisma, email);
    if (account) return done(prisma, account, wantedSlug || "TENANT_DATABASE_URL");
  }

  let tenants = [];
  try {
    tenants = await control.tenant.findMany({
      where: {
        tenantDatabaseEnabled: true,
        tenantDatabaseUrl: { not: null },
        ...(wantedSlug ? { slug: wantedSlug } : {}),
      },
      select: { slug: true, tenantDatabaseUrl: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    if (!err || typeof err !== "object" || (err.code !== "P2022" && err.code !== "P2021")) {
      throw err;
    }
  }

  for (const tenant of tenants) {
    const dbUrl = tenant.tenantDatabaseUrl?.trim();
    if (!dbUrl) continue;
    const prisma = tenantClient(dbUrl);
    clients.push(prisma);
    const account = await tryFindAccount(prisma, email);
    if (account) return done(prisma, account, tenant.slug);
  }

  const error = new Error(
    wantedSlug
      ? `Ящик ${email} не найден в tenant ${wantedSlug}`
      : `Ящик ${email} не найден ни в shared DB, ни в tenant DB`,
  );
  await Promise.allSettled(clients.map((client) => client.$disconnect()));
  throw error;
}

module.exports = { findMailAccountClient };
