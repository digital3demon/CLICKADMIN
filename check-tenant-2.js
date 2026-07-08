const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.tenant.findFirst();
  console.log("Tenant ID:", t.id);
  console.log("aiEnabled:", t.aiEnabled);
  console.log("openRouterApiKey:", t.openRouterApiKey ? `SET (length: ${t.openRouterApiKey.length})` : "NULL/EMPTY");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
