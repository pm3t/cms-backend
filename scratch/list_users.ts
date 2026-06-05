import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({ where: { tenantId: 'gbi-hos' } });
  console.log('Users for gbi-hos:', users.length);
  users.forEach(u => console.log(u.email));
}

listUsers().catch(console.error).finally(() => prisma.$disconnect());
