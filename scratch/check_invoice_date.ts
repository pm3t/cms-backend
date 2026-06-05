import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvoice() {
  const invoice = await prisma.invoice.findFirst({
    where: { xenditInvoiceId: '6a00378c7f2c88af2d7bbbee' }
  });
  console.log('Invoice Status:', invoice?.status);
  console.log('Paid At:', invoice?.paidAt);
}

checkInvoice().catch(console.error).finally(() => prisma.$disconnect());
