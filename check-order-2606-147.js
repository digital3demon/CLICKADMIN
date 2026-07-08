require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const order = await prisma.order.findFirst({ 
    where: { orderNumber: '2606-147' }, 
    include: { emailSourceOrder: { include: { prediction: true } } } 
  });
  console.dir(order?.emailSourceOrder, { depth: null });
}
run().catch(console.error).finally(() => prisma.$disconnect());