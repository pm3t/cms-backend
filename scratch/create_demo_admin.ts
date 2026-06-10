import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@demo.com';
  const tenantId = 'demo-church';
  const password = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: {
      email_tenantId: { email, tenantId }
    },
    update: {
      password,
      name: 'Admin Demo',
    },
    create: {
      email,
      password,
      name: 'Admin Demo',
      tenantId,
    },
  });

  console.log('✅ User berhasil dibuat/diupdate:');
  console.log(`   Email    : ${user.email}`);
  console.log(`   Tenant   : ${user.tenantId}`);
  console.log(`   ID       : ${user.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
