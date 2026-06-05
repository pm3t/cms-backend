import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.financialRecord.findMany({
        where: { tenantId: 'gbi-hos' },
        orderBy: { date: 'desc' },
        include: { member: true }
    });
    console.log('Total records for GBI HOS:', records.length);
    console.log(JSON.stringify(records.slice(0, 5), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
