import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUsers() {
  const tenantId = 'gbi-hos';
  const password = await bcrypt.hash('password123', 10);
  
  console.log(`Creating 19 users for tenant: ${tenantId}...`);
  
  for (let i = 1; i <= 19; i++) {
    const email = `hos${i}@gbihos.com`;
    const name = `User HOS ${i}`;
    
    try {
      await prisma.user.create({
        data: {
          email,
          name,
          password,
          tenantId
        }
      });
      console.log(`Created: ${email}`);
    } catch (error: any) {
      console.error(`Failed to create ${email}:`, error.message);
    }
  }
}

createUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
