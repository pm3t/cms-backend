import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const sub = await prisma.subscription.findFirst({
        where: { tenantId: 'gbi-hos' },
        include: { plan: true }
    });
    console.log('Subscription for GBI HOS:', JSON.stringify(sub, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
