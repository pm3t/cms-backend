import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixInvoiceDate() {
  const xenditInvoiceId = '6a00378c7f2c88af2d7bbbee';
  const today = new Date(); // 2026-05-10
  
  console.log(`Updating invoice ${xenditInvoiceId} paidAt to ${today.toISOString()}...`);
  
  try {
    const updated = await prisma.invoice.updateMany({
      where: { xenditInvoiceId },
      data: {
        status: 'paid',
        paidAt: today
      }
    });
    
    if (updated.count > 0) {
      console.log('Success! Tanggal bayar telah diperbarui ke hari ini.');
    } else {
      console.error('Invoice tidak ditemukan.');
    }
  } catch (error: any) {
    console.error('Gagal memperbarui invoice:', error.message);
  }
}

fixInvoiceDate().catch(console.error).finally(() => prisma.$disconnect());
