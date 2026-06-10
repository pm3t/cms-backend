import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, firstName: true, lastName: true, photoUrl: true, tenantId: true },
    take: 15,
    orderBy: { updatedAt: 'desc' }
  });
  console.log('Members dengan photoUrl:');
  console.log(JSON.stringify(members, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
