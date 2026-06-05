import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listRoles() {
  const roles = await prisma.role.findMany();
  console.log('All roles:', roles);
}

listRoles().catch(console.error).finally(() => prisma.$disconnect());
