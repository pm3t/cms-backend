import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.donationProject.findMany();
    const pledges = await prisma.pledge.findMany({ include: { member: true } });
    console.log('Projects:', JSON.stringify(projects, null, 2));
    console.log('Pledges:', JSON.stringify(pledges, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
