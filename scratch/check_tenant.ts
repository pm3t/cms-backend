import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTenant() {
  const tenantId = 'gbi-hos';
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  console.log('Tenant:', tenant);
}

checkTenant().catch(console.error).finally(() => prisma.$disconnect());
