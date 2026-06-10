import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'mirmatheorara@gmail.com';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Seeding Super Admin...');

  // Create a special tenant for platform admin if not exists
  let platformTenant = await prisma.tenant.findUnique({
    where: { id: 'platform-admin' }
  });

  if (!platformTenant) {
    platformTenant = await prisma.tenant.create({
      data: {
        id: 'platform-admin',
        name: 'Platform Administrator',
        email: email,
      }
    });
  }

  // Use compound unique key since @@unique([email, tenantId])
  const superAdmin = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email,
        tenantId: platformTenant.id,
      }
    },
    update: {
      password: hashedPassword,
      isSuperAdmin: true,
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Platform Super Admin',
      isSuperAdmin: true,
      tenantId: platformTenant.id,
    },
  });

  console.log('Super Admin created successfully!');
  console.log('Email: ' + email);
  console.log('Password: ' + password);
  console.log('ID: ' + superAdmin.id);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
