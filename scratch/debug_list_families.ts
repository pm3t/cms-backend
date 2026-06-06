import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'gbi-hos';
  console.log('Querying families for tenant:', tenantId);
  try {
    const families = await prisma.family.findMany({
      where: { tenantId },
      include: {
        headOfFamily: true,
        members: true
      }
    });
    console.log('Families query success! Result:', JSON.stringify(families, null, 2));
  } catch (error) {
    console.error('Families query failed! Error:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
