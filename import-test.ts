import { PrismaClient } from '@prisma/client';

async function run() {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany();
    console.log("REGISTERED USERS:");
    users.forEach((u: any) => console.log(`Email: ${u.email}`));
    await prisma.$disconnect();
}
run();
