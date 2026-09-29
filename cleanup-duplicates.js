const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Finding duplicate members...');
  
  // Find duplicate emails per tenant
  const membersWithEmails = await prisma.member.findMany({
    where: { email: { not: null } },
    orderBy: { createdAt: 'asc' }
  });

  const emailMap = new Map();
  let deletedCount = 0;

  for (const member of membersWithEmails) {
    if (member.email) {
      const key = `${member.tenantId}_${member.email}`;
      if (emailMap.has(key)) {
        // It's a duplicate, delete it
        console.log(`Deleting duplicate member with email: ${member.email} (Tenant: ${member.tenantId})`);
        await prisma.member.delete({ where: { id: member.id } });
        deletedCount++;
      } else {
        emailMap.set(key, member.id);
      }
    }
  }

  // Find duplicate referenceNumbers per tenant
  const membersWithRefs = await prisma.member.findMany({
    where: { referenceNumber: { not: null } },
    orderBy: { createdAt: 'asc' }
  });

  const refMap = new Map();
  for (const member of membersWithRefs) {
    if (member.referenceNumber) {
      const key = `${member.tenantId}_${member.referenceNumber}`;
      if (refMap.has(key)) {
        // Check if it hasn't been deleted already
        const exists = await prisma.member.findUnique({ where: { id: member.id } });
        if (exists) {
            console.log(`Deleting duplicate member with referenceNumber: ${member.referenceNumber} (Tenant: ${member.tenantId})`);
            await prisma.member.delete({ where: { id: member.id } });
            deletedCount++;
        }
      } else {
        refMap.set(key, member.id);
      }
    }
  }

  console.log(`Cleanup complete. Deleted ${deletedCount} duplicate records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
