import cron from 'node-cron';
import { prisma } from '../prisma';
import { getMemberCategory } from '../domain/member/member.service';

export function startMemberCronJobs() {
  // Sync member categories daily at 01:00 WIB
  cron.schedule('0 1 * * *', async () => {
    console.log('[Cron] Syncing member age categories...');
    await syncMemberCategories();
  }, {
    timezone: 'Asia/Jakarta'
  });
}

export async function syncMemberCategories() {
  try {
    // Fetch all members who have a birthDate
    const members = await prisma.member.findMany({
      where: {
        birthDate: { not: null }
      },
      select: {
        id: true,
        birthDate: true,
        tenantId: true,
        category: true
      }
    });

    let updatedCount = 0;
    for (const member of members) {
      if (member.birthDate) {
        const calculatedCat = await getMemberCategory(member.tenantId, member.birthDate, member.category);
        if (calculatedCat !== member.category) {
          await prisma.member.update({
            where: { id: member.id },
            data: { category: calculatedCat }
          });
          updatedCount++;
        }
      }
    }

    console.log(`[Cron] Member age category sync completed. Updated ${updatedCount} members.`);
  } catch (error) {
    console.error('[Cron Error] syncMemberCategories failed:', error);
  }
}
