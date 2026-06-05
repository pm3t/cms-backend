import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSub() {
  const tenantId = 'gbi-hos';
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Subscription Status:', sub?.status);
}

checkSub().catch(console.error).finally(() => prisma.$disconnect());
