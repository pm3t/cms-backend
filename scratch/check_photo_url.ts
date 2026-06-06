import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    where: {
      photoUrl: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true
    }
  });
  console.log('Members with photos:', JSON.stringify(members, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
