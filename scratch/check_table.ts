import { prisma } from '../src/prisma';

async function main() {
  const result = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'CommunicationTemplate'`;
  console.log(result);
}

main();
