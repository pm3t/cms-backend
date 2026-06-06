import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'gbi-hos';
  console.log('Querying skills for tenant:', tenantId);
  try {
    const skills = await prisma.skill.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: null }
        ]
      },
      include: {
        _count: { select: { members: true } }
      },
      orderBy: { name: 'asc' }
    });
    console.log('Skills query success! Result:', JSON.stringify(skills, null, 2));
  } catch (error) {
    console.error('Skills query failed! Error:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
