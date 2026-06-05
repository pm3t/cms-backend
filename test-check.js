const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const plans = await prisma.plan.findMany();
  console.log(JSON.stringify(plans, null, 2));
  await prisma.$disconnect();
}
run();
