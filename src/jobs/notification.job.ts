import cron from 'node-cron';
import { prisma } from '../prisma';
import { NotificationService } from '../domain/notification/notification.service';

const notificationService = new NotificationService();

export function startNotificationCronJobs() {
  // 1. Daily Birthday Greetings at 06:00 WIB
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Checking daily birthdays...');
    await sendBirthdayGreetings();
  }, {
    timezone: 'Asia/Jakarta'
  });

  // 2. Weekly Sunday Greetings at 06:00 WIB
  cron.schedule('0 6 * * 0', async () => {
    console.log('[Cron] Sending weekly Sunday greetings...');
    await sendSundayGreetings();
  }, {
    timezone: 'Asia/Jakarta'
  });
}

export async function sendBirthdayGreetings() {
  try {
    const today = new Date();
    const targetDay = today.getDate();
    const targetMonth = today.getMonth() + 1; // 1-indexed

    // Query active members with birthDate set
    const members = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        birthDate: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        tenantId: true,
      },
    });

    // Fetch birthday templates for all tenants
    const templates = await prisma.communicationTemplate.findMany({
      where: {
        name: {
          equals: 'Birthday Greeting Template',
          mode: 'insensitive',
        },
      },
    });

    // Map tenantId -> template
    const templateMap = new Map<string, any>();
    for (const t of templates) {
      templateMap.set(t.tenantId, t);
    }

    let sentCount = 0;
    for (const member of members) {
      if (member.birthDate) {
        const bDate = new Date(member.birthDate);
        if (bDate.getDate() === targetDay && (bDate.getMonth() + 1) === targetMonth) {
          try {
            const tenantTemplate = templateMap.get(member.tenantId);
            const fullName = `${member.firstName} ${member.lastName || ''}`.trim();

            let title = '🎂 Selamat Hari Ulang Tahun!';
            let body = `Shalom ${fullName}, segenap keluarga besar gereja mengucapkan Selamat Hari Ulang Tahun. Kiranya damai sejahtera dan berkat Tuhan melimpah senantiasa!`;

            if (tenantTemplate) {
              title = tenantTemplate.subject.replace(/\{\{name\}\}/gi, fullName);
              body = tenantTemplate.body.replace(/\{\{name\}\}/gi, fullName);
            }

            await notificationService.create({
              tenantId: member.tenantId,
              memberId: member.id,
              type: 'BIRTHDAY',
              title,
              body,
            });
            sentCount++;
          } catch (err) {
            console.error(`Failed to send birthday notification to ${member.id}:`, err);
          }
        }
      }
    }

    console.log(`[Cron] Birthday check completed. Sent ${sentCount} greetings.`);
  } catch (error) {
    console.error('[Cron Error] sendBirthdayGreetings failed:', error);
  }
}

export async function sendSundayGreetings() {
  try {
    const members = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        tenantId: true,
      },
    });

    let sentCount = 0;
    for (const member of members) {
      try {
        await notificationService.create({
          tenantId: member.tenantId,
          memberId: member.id,
          type: 'BULK_GREETING',
          title: '✨ Selamat Hari Minggu & Selamat Beribadah',
          body: `Shalom ${member.firstName}, mari bersukacita dan beribadah bersama hari ini di rumah Tuhan. Tuhan Yesus memberkati!`,
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send Sunday greeting to ${member.id}:`, err);
      }
    }

    console.log(`[Cron] Sunday greetings completed. Sent ${sentCount} greetings.`);
  } catch (error) {
    console.error('[Cron Error] sendSundayGreetings failed:', error);
  }
}
