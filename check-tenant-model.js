require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenant = await prisma.tenant.findFirst();
  console.log("Model from DB:", tenant.openRouterModel);
}
run().catch(console.error).finally(() => prisma.$disconnect());