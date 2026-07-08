const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tenant.findFirst().then(t => {
  console.log('aiEnabled:', t.aiEnabled);
  console.log('hasKey:', !!t.openRouterApiKey);
}).catch(console.error).finally(() => prisma.$disconnect());