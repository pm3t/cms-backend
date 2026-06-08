import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const subs = await prisma.subscription.findMany({
    include: { plan: true }
  });
  console.log('Subscriptions:', JSON.stringify(subs, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
