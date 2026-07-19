import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed for Biblical Game questions...');

  // Get tenant
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

  // Today, Yesterday, and Tomorrow dates for scheduled questions
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const questions = [
    // === 1. DAILY BIBLE TRIVIA (QUIZ) ===
    {
      tenantId: tenant.id,
      type: 'QUIZ',
      question: 'Siapakah nama murid yang mengkhianati Yesus dengan imbalan 30 keping perak?',
      options: ['Petrus', 'Yudas Iskariot', 'Yohanes', 'Tomas'],
      correctAnswer: 'Yudas Iskariot',
      passageReference: 'Matius 26:14-16',
      hint: 'Ia adalah bendahara para murid yang akhirnya menyesal dan menggantung diri.',
      points: 10,
      activeDate: today,
    },
    {
      tenantId: tenant.id,
      type: 'QUIZ',
      question: 'Berapa hari Yesus berpuasa di padang gurun sebelum dicobai oleh iblis?',
      options: ['7 hari', '12 hari', '30 hari', '40 hari'],
      correctAnswer: '40 hari',
      passageReference: 'Matius 4:2',
      hint: 'Jumlah hari yang sama dengan lamanya Musa berada di atas gunung Sinai.',
      points: 10,
      activeDate: yesterday,
    },
    {
      tenantId: tenant.id,
      type: 'QUIZ',
      question: 'Kitab apakah yang merupakan kitab terakhir di Perjanjian Lama?',
      options: ['Malakhi', 'Kejadian', 'Matius', 'Wahyu'],
      correctAnswer: 'Malakhi',
      passageReference: 'Malakhi 4',
      hint: 'Kitab nabi kecil terakhir sebelum masa kesunyian 400 tahun.',
      points: 10,
      activeDate: tomorrow,
    },
    {
      tenantId: tenant.id,
      type: 'QUIZ',
      question: 'Siapa nama istri pertama Abraham sebelum namanya diubah oleh Tuhan?',
      options: ['Sarai', 'Sara', 'Hagar', 'Ketura'],
      correctAnswer: 'Sarai',
      passageReference: 'Kejadian 17:15',
      hint: 'Namanya memiliki arti "putriku".',
      points: 10,
      activeDate: null as Date | null, // Fallback bank question
    },

    // === 2. VERSE SCRAMBLE ===
    {
      tenantId: tenant.id,
      type: 'SCRAMBLE',
      question: 'Susun ayat dari Roma 6:23 berikut menjadi urutan yang benar!',
      options: ['Sebab', 'upah', 'dosa', 'ialah', 'maut,', 'tetapi', 'karunia', 'Allah', 'ialah', 'hidup', 'kekal'],
      correctAnswer: 'Sebab upah dosa ialah maut tetapi karunia Allah ialah hidup kekal',
      passageReference: 'Roma 6:23',
      hint: 'Ayat ini berbicara tentang kontras antara upah dosa dan anugerah cuma-cuma dari Allah.',
      points: 10,
      activeDate: today,
    },
    {
      tenantId: tenant.id,
      type: 'SCRAMBLE',
      question: 'Susun ayat dari Mazmur 23:1 berikut menjadi urutan yang benar!',
      options: ['adalah', 'aku.', 'Tuhan', 'takkan', 'gembalaku,', 'kekurangan'],
      correctAnswer: 'Tuhan adalah gembalaku takkan kekurangan aku',
      passageReference: 'Mazmur 23:1',
      hint: 'Mazmur Daud yang sangat terkenal tentang pemeliharaan Tuhan.',
      points: 10,
      activeDate: yesterday,
    },

    // === 3. WORD SEARCH ===
    {
      tenantId: tenant.id,
      type: 'WORD_SEARCH',
      question: 'Cari 3 nama buah Roh dari kata-kata berikut: KASIH, BENCI, DAMAI, SABAR, JAHAT',
      options: ['KASIH', 'BENCI', 'DAMAI', 'SABAR', 'JAHAT'],
      correctAnswer: 'KASIH, DAMAI, SABAR',
      passageReference: 'Galatia 5:22-23',
      hint: 'Ada sembilan buah Roh, tiga di antaranya tercantum sebagai opsi yang benar di sini.',
      points: 10,
      activeDate: today,
    },
    {
      tenantId: tenant.id,
      type: 'WORD_SEARCH',
      question: 'Cari nama 3 murid Yesus dari daftar berikut: TOMAS, MATIUS, HERODES, PILATUS, PETRUS',
      options: ['TOMAS', 'MATIUS', 'HERODES', 'PILATUS', 'PETRUS'],
      correctAnswer: 'TOMAS, MATIUS, PETRUS',
      passageReference: 'Matius 10:2-4',
      hint: 'Hindari nama penguasa Romawi dan raja Yudea.',
      points: 10,
      activeDate: yesterday,
    },

    // === 4. GUESS CHARACTER (TEBAK TOKOH) ===
    {
      tenantId: tenant.id,
      type: 'GUESS',
      question: 'Saya seorang pemungut cukai bertubuh pendek yang memanjat pohon ara untuk melihat Yesus melewati Yerikho. Siapakah saya?',
      options: [] as string[],
      correctAnswer: 'Zakheus',
      passageReference: 'Lukas 19:1-10',
      hint: 'Nama saya diawali dengan huruf Z dan Yesus menumpang di rumah saya hari itu.',
      points: 10,
      activeDate: today,
    },
    {
      tenantId: tenant.id,
      type: 'GUESS',
      question: 'Saya diperintahkan Tuhan untuk membangun sebuah bahtera besar guna menyelamatkan keluarga saya dan sepasang dari setiap jenis hewan dari air bah. Siapakah saya?',
      options: [] as string[],
      correctAnswer: 'Nuh',
      passageReference: 'Kejadian 6',
      hint: 'Nama saya sangat singkat, hanya terdiri dari 3 huruf.',
      points: 10,
      activeDate: yesterday,
    },
    {
      tenantId: tenant.id,
      type: 'GUESS',
      question: 'Saya adalah pemuda gembala yang mengalahkan raksasa Filistin Goliat hanya dengan umban dan batu, dan kemudian menjadi raja Israel. Siapakah saya?',
      options: [] as string[],
      correctAnswer: 'Daud',
      passageReference: '1 Samuel 17',
      hint: 'Saya menulis sebagian besar dari kitab Mazmur.',
      points: 10,
      activeDate: tomorrow,
    }
  ];

  console.log('Deleting existing questions...');
  await prisma.bibleQuestion.deleteMany({
    where: { tenantId: tenant.id }
  });

  console.log('Inserting seed questions...');
  for (const q of questions) {
    await prisma.bibleQuestion.create({
      data: {
        tenantId: q.tenantId,
        type: q.type,
        question: q.question,
        options: q.options && q.options.length > 0 ? q.options : undefined,
        correctAnswer: q.correctAnswer,
        passageReference: q.passageReference,
        hint: q.hint,
        points: q.points,
        activeDate: q.activeDate,
      }
    });
  }

  console.log(`Successfully seeded ${questions.length} Biblical Game questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
