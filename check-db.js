const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      tenantId: true,
      passwordHash: true
    }
  });
  
  console.log("=== MEMBERS IN DB ===");
  for (const m of members) {
    console.log(`Member ID: ${m.id}`);
    console.log(`Name: ${m.firstName} ${m.lastName || ''}`);
    console.log(`Email: ${m.email}`);
    console.log(`Tenant ID: ${m.tenantId}`);
    console.log(`Has Password: ${!!m.passwordHash}`);
    console.log('---');
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
