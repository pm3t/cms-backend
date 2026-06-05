import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({ take: 5 });
    console.log(JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
