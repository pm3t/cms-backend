import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRoles() {
  const tenantId = 'gbi-hos';
  const roles = await prisma.role.findMany({ where: { tenantId } });
  console.log('Roles for gbi-hos:');
  console.log(JSON.stringify(roles, null, 2));
}

checkRoles().catch(console.error).finally(() => prisma.$disconnect());
