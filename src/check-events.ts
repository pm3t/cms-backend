import { prisma } from './prisma';

async function main() {
    console.log("Checking all tenants...");
    const tenants = await prisma.tenant.findMany({});
    console.log("Tenants:", JSON.stringify(tenants, null, 2));

    console.log("Checking all events...");
    const events = await prisma.event.findMany({
        include: {
            tenant: true
        }
    });
    console.log("All Events in DB:", JSON.stringify(events, null, 2));
}

main().catch(err => console.error(err));
