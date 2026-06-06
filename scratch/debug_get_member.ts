import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const memberId = '1fd29b3f-c5e2-445c-9d32-041a97275163';
  console.log('Querying member:', memberId);
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { 
        family: true, 
        sacraments: true,
        skills: { include: { skill: true } }
      }
    });
    console.log('Member query success! Result:', JSON.stringify(member, null, 2));
  } catch (error) {
    console.error('Member query failed! Error:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
