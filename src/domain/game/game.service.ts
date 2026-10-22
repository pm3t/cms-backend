import { prisma } from '../../prisma';
import { z } from 'zod';

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(1, 'Jawaban tidak boleh kosong'),
});

export const submitWordleSchema = z.object({
  wordleId: z.string().uuid(),
  guess: z.string().min(3).max(10),
});

// Katalog Kata Alkitab untuk Daily Wordle
export const BIBLE_WORDLE_CATALOG = [
  {
    word: 'KASIH',
    clue: 'Buah Roh dan hukum yang terutama diajarkan oleh Yesus Kristus.',
    passageReference: '1 Korintus 13:13',
    passageText: 'Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih.',
    devotionalSnippet: 'Kasih sejati tidak menuntut dan tidak mementingkan diri sendiri. Kristus memanggil kita untuk saling mengasihi sebagaimana Ia telah mengasihi kita.'
  },
  {
    word: 'SALIB',
    clue: 'Lambang pengorbanan agung dan penebusan dosa umat manusia.',
    passageReference: '1 Korintus 1:18',
    passageText: 'Sebab pemberitaan tentang salib memang adalah kebodohan bagi mereka yang akan binasa, tetapi bagi kita yang diselamatkan pemberitaan itu adalah kekuatan Allah.',
    devotionalSnippet: 'Salib bukan simbol kekalahan, melainkan bukti kasih terbesar Allah yang menebus dan memulihkan hubungan kita dengan Bapa di surga.'
  },
  {
    word: 'KUDUS',
    clue: 'Sifat hakiki Allah yang dipanggil untuk tercermin dalam hidup orang percaya.',
    passageReference: '1 Petrus 1:16',
    passageText: 'Sebab ada tertulis: Kuduslah kamu, sebab Aku kudus.',
    devotionalSnippet: 'Kekudusan adalah panggilan hidup sehari-hari. Hidup kudus berarti memisahkan diri dari kecemaran dunia dan mengkhususkan hati bagi kemuliaan Tuhan.'
  },
  {
    word: 'BERKAT',
    clue: 'Limpahan anugerah, pemeliharaan, dan kebaikan Tuhan atas hidup kita.',
    passageReference: 'Bilangan 6:24-26',
    passageText: 'TUHAN memberkati engkau dan melindungi engkau; TUHAN menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; TUHAN menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera.',
    devotionalSnippet: 'Berkat terbesar bukanlah kelimpahan materi, melainkan penyertaan dan damai sejahtera Tuhan yang melampaui segala akal.'
  },
  {
    word: 'HARUN',
    clue: 'Imam besar pertama bangsa Israel dan saudara sekaligus juru bicara Musa.',
    passageReference: 'Keluaran 4:14',
    passageText: 'Bukankah Harun, orang Lewi itu, saudaramu? Aku tahu, bahwa ia pandai bicara. Lagipula ia telah berangkat menjumpai engkau...',
    devotionalSnippet: 'Tuhan memperlengkapi kita dengan karunia yang saling melengkapi. Kebersamaan Musa dan Harun mengajarkan pentingnya saling mendukung dalam melayani Tuhan.'
  },
  {
    word: 'MANNA',
    clue: 'Makanan ajaib dari surga yang memelihara bangsa Israel di padang gurun.',
    passageReference: 'Keluaran 16:31',
    passageText: 'Umat Israel menamai roti itu: manna; warnanya putih seperti ketumbar dan rasanya seperti rasa kue madu.',
    devotionalSnippet: 'Tuhan mencukupkan kebutuhan kita setiap hari. Manna mengingatkan kita untuk selalu mengucap syukur dan bersandar pada janji pemeliharaan Allah.'
  },
  {
    word: 'DAMAI',
    clue: 'Ketenangan batin yang dianugerahkan oleh Roh Kudus di tengah badai kehidupan.',
    passageReference: 'Filipi 4:7',
    passageText: 'Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.',
    devotionalSnippet: 'Dunia tidak dapat memberikan damai sejati. Hanya di dalam Yesus kita beroleh ketenangan jiwa yang teguh menghadapi segala tantangan.'
  },
  {
    word: 'YUSUF',
    clue: 'Anak Yakub yang dijual ke Mesir namun dipakai Allah menyelamatkan bangsanya.',
    passageReference: 'Kejadian 50:20',
    passageText: 'Memang kamu telah mereka-rekakan yang jahat terhadap aku, tetapi Allah telah mereka-rekakannya untuk kebaikan...',
    devotionalSnippet: 'Apa yang dirancang orang jahat dapat diubah oleh Allah menjadi jalan kebaikan. Tetaplah setia dalam proses Tuhan, karena rancangan-Nya penuh damai sejahtera.'
  },
  {
    word: 'PETRUS',
    clue: 'Murid Yesus yang dikenal sebagai nelayan dan pemberani, batu karang gereja mula-mula.',
    passageReference: 'Matius 16:18',
    passageText: 'Dan Aku pun berkata kepadamu: Engkau adalah Petrus dan di atas batu karang ini Aku akan mendirikan jemaat-Ku...',
    devotionalSnippet: 'Meskipun pernah jatuh dan menyangkal, kasih karunia Kristus memulihkan Petrus menjadi saksi yang luar biasa. Kegagalan masa lalu tidak membatalkan panggilan Tuhan atas hidupmu.'
  },
  {
    word: 'SINAI',
    clue: 'Gunung kudus tempat Musa menerima dua loh batu Sepuluh Perintah Allah.',
    passageReference: 'Keluaran 19:20',
    passageText: 'Lalu turunlah TUHAN ke atas gunung Sinai, ke puncak gunung itu; TUHAN memanggil Musa ke puncak gunung itu, maka naiklah Musa.',
    devotionalSnippet: 'Gunung Sinai mengingatkan kita akan kemuliaan dan kekudusan firman Tuhan. Taurat Tuhan sempurna, menyegarkan jiwa dan memberikan hikmat.'
  }
];

// Seed Kuis Tangga Iman (Themed Trivia) Pilihan Ganda Bersih
export const SEED_TRIVIA_QUESTIONS = [
  // 1. KATEGORI TOKOH
  {
    category: 'TOKOH',
    question: 'Siapakah tokoh Alkitab yang mengalahkan raksasa Goliat hanya dengan umban dan sebuah batu licin?',
    options: ['Saul', 'Daud', 'Salomo', 'Yonatan'],
    correctAnswer: 'Daud',
    passageReference: '1 Samuel 17:49-50',
    explanation: 'Daud, seorang gembala muda, mengandalkan nama TUHAN semesta alam saat menghadapi Goliat dan meraih kemenangan gemilang.',
    points: 15
  },
  {
    category: 'TOKOH',
    question: 'Siapakah nabi yang diangkat ke surga dalam angin badai dengan kereta berapi dan kuda berapi?',
    options: ['Elia', 'Elisa', 'Yesaya', 'Yeremia'],
    correctAnswer: 'Elia',
    passageReference: '2 Raja-raja 2:11',
    explanation: 'Nabi Elia diangkat ke surga tanpa mengalami kematian biasa, disaksikan langsung oleh Elisa muridnya.',
    points: 15
  },
  {
    category: 'TOKOH',
    question: 'Siapakah nama ratu Yahudi yang memberanikan diri menghadap raja demi menyelamatkan bangsanya dari kebinasaan?',
    options: ['Rut', 'Ester', 'Debora', 'Ribka'],
    correctAnswer: 'Ester',
    passageReference: 'Ester 4:14-16',
    explanation: 'Ratu Ester dengan perkataan legendaris "Kalau terpaksa aku mati, biarlah aku mati", berpuasa dan menyelamatkan bangsanya.',
    points: 15
  },
  // 2. KATEGORI MUKJIZAT
  {
    category: 'MUKJIZAT',
    question: 'Di kota manakah Yesus mengadakan mukjizat pertama-Nya dengan mengubah air menjadi anggur?',
    options: ['Yerusalem', 'Kapernaum', 'Kana di Galilea', 'Nazaret'],
    correctAnswer: 'Kana di Galilea',
    passageReference: 'Yohanes 2:11',
    explanation: 'Mukjizat di pesta pernikahan Kana di Galilea adalah tanda pertama di mana Yesus menyatakan kemuliaan-Nya dan murid-murid-Nya percaya kepada-Nya.',
    points: 15
  },
  {
    category: 'MUKJIZAT',
    question: 'Berapakah bekal awal yang diperbanyak Yesus untuk memberi makan lima ribu orang laki-laki?',
    options: ['5 roti dan 2 ikan', '7 roti dan beberapa ikan kecil', '3 roti dan 1 ikan', '12 bakul roti'],
    correctAnswer: '5 roti dan 2 ikan',
    passageReference: 'Matius 14:17-21',
    explanation: 'Dari bekal kecil seorang anak yaitu 5 roti jelai dan 2 ikan, Yesus mengucap syukur dan memberi makan ribuan orang bahkan bersisa 12 bakul.',
    points: 15
  },
  {
    category: 'MUKJIZAT',
    question: 'Siapakah sahabat Yesus yang dibangkitkan dari kematian setelah empat hari berada di dalam kubur?',
    options: ['Zakeus', 'Lazarus', 'Bartimeus', 'Yairus'],
    correctAnswer: 'Lazarus',
    passageReference: 'Yohanes 11:43-44',
    explanation: 'Yesus berseru dengan suara nyaring: "Lazarus, marilah ke luar!" membuktikan bahwa Dialah kebangkitan dan hidup.',
    points: 15
  },
  // 3. KATEGORI KISAH_RASUL
  {
    category: 'KISAH_RASUL',
    question: 'Pada hari raya apakah Roh Kudus dicurahkan ke atas para murid di Yerusalem dengan lidah-lidah seperti nyala api?',
    options: ['Paskah', 'Pentakosta', 'Pondok Daun', 'Purim'],
    correctAnswer: 'Pentakosta',
    passageReference: 'Kisah Para Rasul 2:1-4',
    explanation: 'Hari Pentakosta menandai lahirnya gereja mula-mula saat Roh Kudus memenuhi para rasul dan memberi mereka keberanian bersaksi.',
    points: 15
  },
  {
    category: 'KISAH_RASUL',
    question: 'Di manakah murid-murid Yesus untuk pertama kalinya disebut sebagai "Kristen"?',
    options: ['Antiokhia', 'Roma', 'Efesus', 'Korintus'],
    correctAnswer: 'Antiokhia',
    passageReference: 'Kisah Para Rasul 11:26',
    explanation: 'Jemaat di Antiokhia hidup begitu meneladani Kristus sehingga masyarakat sekitar untuk pertama kalinya menyebut mereka "Kristen".',
    points: 15
  },
  // 4. KATEGORI AMSAL
  {
    category: 'AMSAL',
    question: 'Menurut Amsal 1:7, apakah permulaan dari segala pengetahuan?',
    options: ['Kekayaan dan hikmat', 'Takut akan TUHAN', 'Rajin membaca Taurat', 'Pengalaman hidup'],
    correctAnswer: 'Takut akan TUHAN',
    passageReference: 'Amsal 1:7',
    explanation: 'Takut akan TUHAN adalah dasar dan fondasi sejati untuk memperoleh hikmat dan pengertian yang benar.',
    points: 15
  },
  {
    category: 'AMSAL',
    question: 'Apakah yang dikatakan Amsal 15:1 mengenai jawaban yang dapat meredakan kegeraman?',
    options: ['Jawaban yang lemah lembut', 'Jawaban yang tegas', 'Diam tanpa kata', 'Jawaban yang bijak'],
    correctAnswer: 'Jawaban yang lemah lembut',
    passageReference: 'Amsal 15:1',
    explanation: '"Jawaban yang lemah lembut meredakan kegeraman, tetapi perkataan yang pedas membangkitkan marah."',
    points: 15
  }
];

export class GameService {
  /**
   * Helper to get today's date string in Asia/Jakarta timezone
   */
  private getJakartaTodayStr(): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')!.value;
    const month = parts.find((p) => p.type === 'month')!.value.padStart(2, '0');
    const day = parts.find((p) => p.type === 'day')!.value.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =========================================================================
  // 1. WORDLE FIRMAN (DAILY BIBLE WORDLE)
  // =========================================================================

  /**
   * Mengambil atau membuat tantangan Wordle Firman untuk hari ini.
   */
  async getTodayWordle(memberId: string, tenantId: string) {
    const dateStr = this.getJakartaTodayStr();

    // 1. Cari data Wordle hari ini
    let wordleDay = await prisma.bibleWordleDay.findFirst({
      where: {
        dateStr,
        OR: [{ tenantId }, { tenantId: null }]
      }
    });

    // 2. Jika belum ada, ambil kata dari katalog berdasarkan index tanggal
    if (!wordleDay) {
      // Formula hari deterministik
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const catalogItem = BIBLE_WORDLE_CATALOG[dayOfYear % BIBLE_WORDLE_CATALOG.length];

      wordleDay = await prisma.bibleWordleDay.create({
        data: {
          tenantId,
          dateStr,
          word: catalogItem.word.toUpperCase(),
          clue: catalogItem.clue,
          passageReference: catalogItem.passageReference,
          passageText: catalogItem.passageText,
          devotionalSnippet: catalogItem.devotionalSnippet,
          points: 30
        }
      });
    }

    // 3. Ambil riwayat tebakan member hari ini
    const attempt = await prisma.bibleWordleAttempt.findUnique({
      where: {
        memberId_wordleDayId: {
          memberId,
          wordleDayId: wordleDay.id
        }
      }
    });

    const guesses = (attempt?.guesses as string[]) || [];
    const isSolved = attempt?.isSolved || false;
    const isGameOver = isSolved || guesses.length >= 6;

    // Evaluasi riwayat tebakan menjadi kotak warna
    const evaluatedGuesses = guesses.map(g => this.evaluateWordleGuess(g, wordleDay!.word));

    return {
      id: wordleDay.id,
      dateStr: wordleDay.dateStr,
      wordLength: wordleDay.word.length,
      clue: wordleDay.clue,
      points: wordleDay.points,
      guesses,
      evaluatedGuesses,
      isSolved,
      isGameOver,
      remainingAttempts: Math.max(0, 6 - guesses.length),
      // Hanya kirim kata rahasia dan renungan jika permainan sudah selesai
      word: isGameOver ? wordleDay.word : null,
      passageReference: isGameOver ? wordleDay.passageReference : null,
      passageText: isGameOver ? wordleDay.passageText : null,
      devotionalSnippet: isGameOver ? wordleDay.devotionalSnippet : null,
    };
  }

  /**
   * Evaluasi tebakan Wordle (CORRECT = hijau, PRESENT = kuning, ABSENT = abu-abu)
   */
  private evaluateWordleGuess(guess: string, targetWord: string) {
    const target = targetWord.toUpperCase();
    const g = guess.toUpperCase();
    const result: { letter: string; status: 'CORRECT' | 'PRESENT' | 'ABSENT' }[] = [];
    const targetLetters = target.split('');
    const matched = new Array(target.length).fill(false);

    // Langkah 1: Cek posisi yang tepat (Hijau)
    for (let i = 0; i < g.length; i++) {
      if (g[i] === target[i]) {
        result[i] = { letter: g[i], status: 'CORRECT' };
        matched[i] = true;
      }
    }

    // Langkah 2: Cek huruf yang ada tapi beda posisi (Kuning)
    for (let i = 0; i < g.length; i++) {
      if (result[i]) continue;

      let foundIndex = -1;
      for (let j = 0; j < targetLetters.length; j++) {
        if (!matched[j] && targetLetters[j] === g[i]) {
          foundIndex = j;
          break;
        }
      }

      if (foundIndex !== -1) {
        result[i] = { letter: g[i], status: 'PRESENT' };
        matched[foundIndex] = true;
      } else {
        result[i] = { letter: g[i], status: 'ABSENT' };
      }
    }

    return result;
  }

  /**
   * Submit tebakan kata Wordle Firman
   */
  async submitWordleGuess(memberId: string, tenantId: string, data: { wordleId: string; guess: string }) {
    const parsed = submitWordleSchema.parse(data);
    const cleanGuess = parsed.guess.trim().toUpperCase();

    const wordleDay = await prisma.bibleWordleDay.findUnique({
      where: { id: parsed.wordleId }
    });
    if (!wordleDay) {
      throw new Error('Data Wordle tidak ditemukan');
    }

    if (cleanGuess.length !== wordleDay.word.length) {
      throw new Error(`Panjang kata harus ${wordleDay.word.length} huruf.`);
    }

    // Ambil atau inisialisasi attempt
    let attempt = await prisma.bibleWordleAttempt.findUnique({
      where: {
        memberId_wordleDayId: {
          memberId,
          wordleDayId: wordleDay.id
        }
      }
    });

    if (attempt?.isSolved) {
      throw new Error('Anda sudah berhasil menyelesaikan Wordle Firman hari ini!');
    }

    const currentGuesses = (attempt?.guesses as string[]) || [];
    if (currentGuesses.length >= 6) {
      throw new Error('Kesempatan menebak hari ini telah habis (maksimal 6 kali).');
    }

    const newGuesses = [...currentGuesses, cleanGuess];
    const isSolved = cleanGuess === wordleDay.word.toUpperCase();
    const isGameOver = isSolved || newGuesses.length >= 6;

    // Hitung poin: makin sedikit tebakan makin tinggi poin (bonus)
    let pointsEarned = 0;
    if (isSolved) {
      const attemptsCount = newGuesses.length;
      if (attemptsCount === 1) pointsEarned = 50;
      else if (attemptsCount <= 3) pointsEarned = 35;
      else pointsEarned = 25;
    }

    // Simpan attempt
    if (attempt) {
      attempt = await prisma.bibleWordleAttempt.update({
        where: { id: attempt.id },
        data: {
          guesses: newGuesses,
          isSolved,
          pointsEarned
        }
      });
    } else {
      attempt = await prisma.bibleWordleAttempt.create({
        data: {
          wordleDayId: wordleDay.id,
          memberId,
          guesses: newGuesses,
          isSolved,
          pointsEarned
        }
      });
    }

    // Update profil skor jika berhasil
    if (pointsEarned > 0) {
      await this.addPointsAndStreak(memberId, tenantId, pointsEarned);
    }

    const evaluation = this.evaluateWordleGuess(cleanGuess, wordleDay.word);
    const evaluatedGuesses = newGuesses.map(g => this.evaluateWordleGuess(g, wordleDay.word));

    return {
      evaluation,
      evaluatedGuesses,
      guesses: newGuesses,
      isSolved,
      isGameOver,
      pointsEarned,
      remainingAttempts: Math.max(0, 6 - newGuesses.length),
      word: isGameOver ? wordleDay.word : null,
      passageReference: isGameOver ? wordleDay.passageReference : null,
      passageText: isGameOver ? wordleDay.passageText : null,
      devotionalSnippet: isGameOver ? wordleDay.devotionalSnippet : null,
    };
  }

  // =========================================================================
  // 2. TANGGA IMAN (THEMED BIBLE TRIVIA)
  // =========================================================================

  /**
   * Seed soal otomatis jika tabel kosong untuk tenant ini
   */
  private async ensureTriviaQuestionsSeeded(tenantId: string) {
    const count = await prisma.bibleQuestion.count({
      where: { tenantId, type: 'QUIZ' }
    });

    if (count === 0) {
      for (const q of SEED_TRIVIA_QUESTIONS) {
        await prisma.bibleQuestion.create({
          data: {
            tenantId,
            type: 'QUIZ',
            category: q.category,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            passageReference: q.passageReference,
            explanation: q.explanation,
            points: q.points
          }
        });
      }
    }
  }

  /**
   * Mengambil daftar pertanyaan Tangga Iman (Pilihan Ganda Bersih)
   */
  async getTriviaQuestions(memberId: string, tenantId: string, category?: string) {
    await this.ensureTriviaQuestionsSeeded(tenantId);

    const whereClause: any = {
      tenantId,
      type: 'QUIZ',
    };
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    const questions = await prisma.bibleQuestion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    const questionIds = questions.map(q => q.id);
    const attempts = await prisma.bibleGameAttempt.findMany({
      where: {
        memberId,
        questionId: { in: questionIds }
      }
    });

    return questions.map(q => {
      const attempt = attempts.find(a => a.questionId === q.id);
      let optionsArray: string[] = [];
      if (Array.isArray(q.options)) {
        optionsArray = q.options as string[];
      } else if (typeof q.options === 'string') {
        try { optionsArray = JSON.parse(q.options); } catch { optionsArray = []; }
      }

      return {
        id: q.id,
        category: q.category || 'UMUM',
        question: q.question,
        options: optionsArray,
        points: q.points,
        passageReference: attempt ? q.passageReference : null,
        explanation: attempt ? q.explanation : null,
        correctAnswer: attempt ? q.correctAnswer : null,
        isAttempted: !!attempt,
        isCorrect: attempt ? attempt.isCorrect : null,
        userAnswer: attempt ? (attempt as any).userAnswer || null : null
      };
    });
  }

  /**
   * Submit jawaban Tangga Iman (Pilihan Ganda)
   */
  async submitTriviaAnswer(memberId: string, tenantId: string, data: { questionId: string; answer: string }) {
    const parsed = submitAnswerSchema.parse(data);
    const { questionId, answer } = parsed;

    const question = await prisma.bibleQuestion.findFirst({
      where: { id: questionId, tenantId },
    });
    if (!question) {
      throw new Error('Pertanyaan tidak ditemukan');
    }

    const existingAttempt = await prisma.bibleGameAttempt.findUnique({
      where: {
        memberId_questionId: {
          memberId,
          questionId,
        },
      },
    });
    if (existingAttempt) {
      throw new Error('Pertanyaan ini sudah pernah Anda jawab');
    }

    // Bersihkan dan periksa kecocokan pilihan ganda
    const cleanUser = answer.trim().toLowerCase();
    const cleanCorrect = question.correctAnswer.trim().toLowerCase();
    const isCorrect = cleanUser === cleanCorrect;
    const pointsEarned = isCorrect ? question.points : 0;

    await prisma.bibleGameAttempt.create({
      data: {
        tenantId,
        memberId,
        questionId,
        isCorrect,
        pointsEarned,
      },
    });

    if (pointsEarned > 0) {
      await this.addPointsAndStreak(memberId, tenantId, pointsEarned);
    }

    return {
      isCorrect,
      pointsEarned,
      correctAnswer: question.correctAnswer,
      passageReference: question.passageReference,
      explanation: question.explanation || 'Terus belajar firman Tuhan setiap hari untuk menumbuhkan iman.',
    };
  }

  // =========================================================================
  // 3. STATISTIK & LEADERBOARD
  // =========================================================================

  private async addPointsAndStreak(memberId: string, tenantId: string, points: number) {
    let score = await prisma.memberGameScore.findUnique({
      where: { memberId },
    });

    const todayStr = this.getJakartaTodayStr();
    const today = new Date(`${todayStr}T00:00:00.000+07:00`);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

    let newStreak = 1;

    if (score) {
      if (score.lastPlayedAt) {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        const parts = formatter.formatToParts(new Date(score.lastPlayedAt));
        const lastYear = parts.find((p) => p.type === 'year')!.value;
        const lastMonth = parts.find((p) => p.type === 'month')!.value.padStart(2, '0');
        const lastDay = parts.find((p) => p.type === 'day')!.value.padStart(2, '0');
        const lastPlayedStr = `${lastYear}-${lastMonth}-${lastDay}`;

        if (lastPlayedStr === todayStr) {
          newStreak = score.currentStreak;
        } else if (lastPlayedStr === yesterdayStr) {
          newStreak = score.currentStreak + 1;
        } else {
          newStreak = 1;
        }
      }

      const maxStreak = Math.max(score.maxStreak, newStreak);

      await prisma.memberGameScore.update({
        where: { memberId },
        data: {
          totalPoints: score.totalPoints + points,
          currentStreak: newStreak,
          maxStreak,
          lastPlayedAt: new Date(),
        },
      });
    } else {
      await prisma.memberGameScore.create({
        data: {
          tenantId,
          memberId,
          totalPoints: points,
          currentStreak: newStreak,
          maxStreak: newStreak,
          lastPlayedAt: new Date(),
        },
      });
    }
  }

  async getGameProfile(memberId: string, tenantId: string) {
    let score = await prisma.memberGameScore.findUnique({
      where: { memberId },
    });

    if (!score) {
      return {
        totalPoints: 0,
        currentStreak: 0,
        maxStreak: 0,
        rank: '-',
      };
    }

    const higherScoresCount = await prisma.memberGameScore.count({
      where: {
        tenantId,
        totalPoints: {
          gt: score.totalPoints,
        },
      },
    });

    return {
      totalPoints: score.totalPoints,
      currentStreak: score.currentStreak,
      maxStreak: score.maxStreak,
      lastPlayedAt: score.lastPlayedAt,
      rank: higherScoresCount + 1,
    };
  }

  async getLeaderboard(tenantId: string, limit = 20) {
    const scores = await prisma.memberGameScore.findMany({
      where: { tenantId },
      orderBy: { totalPoints: 'desc' },
      take: limit,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
      },
    });

    return scores.map((s, index) => ({
      rank: index + 1,
      memberId: s.memberId,
      name: `${s.member.firstName} ${s.member.lastName || ''}`.trim(),
      photoUrl: s.member.photoUrl,
      totalPoints: s.totalPoints,
      currentStreak: s.currentStreak,
    }));
  }

  // Backward compatibility alias
  async getTodayQuestions(memberId: string, tenantId: string) {
    return this.getTriviaQuestions(memberId, tenantId);
  }

  async submitAnswer(memberId: string, tenantId: string, data: { questionId: string; answer: string }) {
    return this.submitTriviaAnswer(memberId, tenantId, data);
  }
}

