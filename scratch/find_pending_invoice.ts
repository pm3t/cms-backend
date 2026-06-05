import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findPendingInvoice() {
  const invoice = await prisma.invoice.findFirst({
    where: { status: 'pending' }
  });
  console.log('Pending Invoice:', invoice);
}

findPendingInvoice().catch(console.error).finally(() => prisma.$disconnect());
