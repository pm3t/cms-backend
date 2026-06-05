import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.financialRecord.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { member: true, project: true, pledge: true }
    });
    console.log(JSON.stringify(records, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
