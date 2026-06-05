import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
  const tenantId = 'gbi-hos';
  console.log(`Diagnosing tenant: ${tenantId}`);
  
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  console.log('Tenant:', tenant ? 'Found' : 'NOT FOUND');
  
  const subs = await prisma.subscription.findMany({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${subs.length} subscriptions:`);
  subs.forEach((s, i) => {
    console.log(`${i+1}. ID: ${s.id}, Plan: ${s.plan.name}, Status: ${s.status}, EndDate: ${s.endDate}`);
  });
}

diagnose().catch(console.error).finally(() => prisma.$disconnect());
