import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed for devotions and reading plans...');

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id: 'demo-church' },
        { name: 'demo-church' },
        { domain: 'demo-church' }
      ]
    }
  }) || await prisma.tenant.findFirst({
    where: {
      NOT: { id: 'platform-admin' }
    }
  }) || await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('No tenant found. Please run the main seed first.');
    return;
  }

  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // 1. Seed Devotions
  const devDevotions = [
    {
      title: 'Tinggal di Dalam Dia',
      scriptureReference: 'Yohanes 15:4',
      passageText: 'Tinggallah di dalam Aku dan Aku di dalam kamu. Sama seperti ranting tidak dapat berbuah dari dirinya sendiri, kalau ia tidak tinggal pada pokok anggur, demikian juga kamu tidak dapat berbuah, jikalau kamu tidak tinggal di dalam Aku.',
      content: 'Yesus menggambarkan hubungan-Nya dengan kita seperti pokok anggur dan ranting-rantingnya. Ranting tidak dapat hidup atau menghasilkan buah tanpa terhubung dengan pokoknya. Kehidupan rohani kita sepenuhnya bergantung pada seberapa dekat kita tinggal di dalam Kristus melalui doa, firman-Nya, dan persekutuan yang intim setiap hari. Hari ini, mari kita sengaja meluangkan waktu bersaat teduh dan mendekatkan diri pada-Nya.',
      author: 'Pdt. Andreas Pratama',
      publishDate: new Date(), // Today
    },
    {
      title: 'Mengalahkan Khawatir',
      scriptureReference: 'Matius 6:34',
      passageText: 'Sebab itu janganlah kamu khawatir akan hari besok, karena hari besok mempunyai kesusahannya sendiri. Kesusahan sehari cukuplah untuk sehari.',
      content: 'Khawatir adalah pencuri sukacita hari ini. Yesus mengajarkan bahwa Bapa di surga memelihara burung-burung di udara dan bunga bakung di ladang, terlebih lagi kita anak-anak-Nya. Belajarlah menyerahkan segala kekhawatiran kita kepada Tuhan dalam doa, karena Dia yang memegang hari esok kita.',
      author: 'Ev. Maria Susanti',
      publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    },
    {
      title: 'Kekuatan dalam Kelemahan',
      scriptureReference: '2 Korintus 12:9',
      passageText: 'Tetapi jawab Tuhan kepadaku: "Cukuplah kasih karunia-Ku bagimu, sebab di dalam kelemahanlah kuasa-Ku menjadi sempurna."',
      content: 'Saat kita merasa lemah dan tidak berdaya, di situlah kuasa Tuhan bekerja secara maksimal. Kelemahan kita menjadi sarana di mana kemuliaan dan anugerah Tuhan dinyatakan. Jangan putus asa atas keterbatasan kita; serahkan semuanya dalam tangan Tuhan.',
      author: 'Pdt. Andreas Pratama',
      publishDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }
  ];

  for (const d of devDevotions) {
    await prisma.dailyDevotion.create({
      data: {
        tenantId: tenant.id,
        title: d.title,
        scriptureReference: d.scriptureReference,
        passageText: d.passageText,
        content: d.content,
        author: d.author,
        publishDate: d.publishDate
      }
    });
  }
  console.log(`Seeded ${devDevotions.length} devotions.`);

  // 2. Seed Bible Reading Plans
  const plans = [
    {
      title: 'Kitab Injil Yohanes (7 Hari)',
      description: 'Program membaca 7 hari untuk merenungkan keilahian Kristus melalui Injil Yohanes.',
      durationDays: 7,
      days: [
        { dayNumber: 1, scripturePassage: 'Yohanes 1-3' },
        { dayNumber: 2, scripturePassage: 'Yohanes 4-6' },
        { dayNumber: 3, scripturePassage: 'Yohanes 7-9' },
        { dayNumber: 4, scripturePassage: 'Yohanes 10-12' },
        { dayNumber: 5, scripturePassage: 'Yohanes 13-15' },
        { dayNumber: 6, scripturePassage: 'Yohanes 16-18' },
        { dayNumber: 7, scripturePassage: 'Yohanes 19-21' }
      ]
    },
    {
      title: 'Kisah Para Rasul Awal (5 Hari)',
      description: 'Pelajari awal mula gereja mula-mula dan kepemimpinan Roh Kudus.',
      durationDays: 5,
      days: [
        { dayNumber: 1, scripturePassage: 'Kisah Para Rasul 1-2' },
        { dayNumber: 2, scripturePassage: 'Kisah Para Rasul 3-4' },
        { dayNumber: 3, scripturePassage: 'Kisah Para Rasul 5-6' },
        { dayNumber: 4, scripturePassage: 'Kisah Para Rasul 7-8' },
        { dayNumber: 5, scripturePassage: 'Kisah Para Rasul 9-10' }
      ]
    }
  ];

  for (const p of plans) {
    await prisma.bibleReadingPlan.create({
      data: {
        tenantId: tenant.id,
        title: p.title,
        description: p.description,
        durationDays: p.durationDays,
        days: {
          createMany: {
            data: p.days.map(d => ({
              dayNumber: d.dayNumber,
              scripturePassage: d.scripturePassage
            }))
          }
        }
      }
    });
  }

  console.log(`Seeded ${plans.length} reading plans.`);
  console.log('Seeding devotions & plans complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
