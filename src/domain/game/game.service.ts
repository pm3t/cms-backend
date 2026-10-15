import { prisma } from '../../prisma';
import { z } from 'zod';

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(1, 'Jawaban tidak boleh kosong'),
});

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

  /**
   * Get today's questions for a member.
   * If there are no questions assigned for today, it falls back to random questions
   * that the member hasn't successfully attempted yet.
   */
  async getTodayQuestions(memberId: string, tenantId: string) {
    const todayStr = this.getJakartaTodayStr();
    const startOfToday = new Date(`${todayStr}T00:00:00.000+07:00`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999+07:00`);

    // 1. Fetch questions that are scheduled for today
    let questions = await prisma.bibleQuestion.findMany({
      where: {
        tenantId,
        activeDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // 2. Fallback: if no questions are assigned for today, fetch up to 4 questions
    // (one of each type if possible) that the member has not attempted yet.
    if (questions.length === 0) {
      const attemptedQuestionIds = await prisma.bibleGameAttempt
        .findMany({
          where: { memberId },
          select: { questionId: true },
        })
        .then((attempts) => attempts.map((a) => a.questionId));

      const types = ['QUIZ', 'SCRAMBLE', 'WORD_SEARCH', 'GUESS'];
      questions = [];

      for (const type of types) {
        const question = await prisma.bibleQuestion.findFirst({
          where: {
            tenantId,
            type,
            id: {
              notIn: attemptedQuestionIds,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
        if (question) {
          questions.push(question);
        }
      }

      // If still empty, just get any 4 questions
      if (questions.length === 0) {
        questions = await prisma.bibleQuestion.findMany({
          where: { tenantId },
          take: 4,
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    // 3. For each question, check if the member has attempted it
    const questionIds = questions.map((q) => q.id);
    const attempts = await prisma.bibleGameAttempt.findMany({
      where: {
        memberId,
        questionId: { in: questionIds },
      },
    });

    return questions.map((q) => {
      const attempt = attempts.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options, // Should be parsed JSON
        passageReference: q.passageReference,
        hint: q.hint,
        points: q.points,
        isAttempted: !!attempt,
        isCorrect: attempt ? attempt.isCorrect : null,
        correctAnswer: attempt ? q.correctAnswer : undefined,
      };
    });
  }

  /**
   * Helper to clean text: lowercase, strip punctuation, collapse extra spaces.
   */
  private cleanText(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper for guessing biblical characters: remove titles like raja, nabi, rasul, etc.
   */
  private cleanGuessText(str: string): string {
    let cleaned = this.cleanText(str);
    cleaned = cleaned.replace(/^(raja|nabi|rasul|bapa|ibu|imam|pendeta|pastor|murid)\s+/i, '').trim();
    cleaned = cleaned.replace(/\bzakeus\b/g, 'zakheus');
    cleaned = cleaned.replace(/\byohanes pembaptis\b/g, 'yohanes');
    return cleaned;
  }

  /**
   * Intelligent, forgiving answer comparison across all question types.
   */
  private checkAnswerMatch(type: string, userAnswer: string, correctAnswer: string, options?: any): boolean {
    if (!userAnswer || !correctAnswer) return false;

    const rawUser = userAnswer.trim();
    const rawCorrect = correctAnswer.trim();

    // 1. Direct equality (case-insensitive)
    if (rawUser.toLowerCase() === rawCorrect.toLowerCase()) {
      return true;
    }

    const cleanUser = this.cleanText(userAnswer);
    const cleanCorrect = this.cleanText(correctAnswer);

    if (cleanUser === cleanCorrect) {
      return true;
    }

    // 2. Type-specific validations
    if (type === 'QUIZ') {
      const stripPrefix = (s: string) => this.cleanText(s.replace(/^[a-d1-4][.)\-]\s*/i, ''));
      if (stripPrefix(userAnswer) === stripPrefix(correctAnswer)) {
        return true;
      }

      // Check letter or option index matching
      let optsArray: string[] = [];
      if (options) {
        if (Array.isArray(options)) {
          optsArray = options;
        } else if (typeof options === 'string') {
          try {
            optsArray = JSON.parse(options);
          } catch {
            optsArray = options.split(',').map((s: string) => s.trim());
          }
        }
      }

      if (optsArray.length > 0) {
        const letters = ['a', 'b', 'c', 'd'];
        const userLetter = cleanUser.length === 1 && letters.includes(cleanUser) ? cleanUser : null;
        const correctLetter = cleanCorrect.length === 1 && letters.includes(cleanCorrect) ? cleanCorrect : null;

        let correctOptIdx = optsArray.findIndex(
          (opt) => this.cleanText(opt) === cleanCorrect || stripPrefix(opt) === stripPrefix(correctAnswer)
        );
        if (correctOptIdx === -1 && correctLetter) {
          correctOptIdx = letters.indexOf(correctLetter);
        }

        if (correctOptIdx !== -1) {
          const expectedOption = optsArray[correctOptIdx];
          if (
            cleanUser === this.cleanText(expectedOption) ||
            stripPrefix(userAnswer) === stripPrefix(expectedOption)
          ) {
            return true;
          }
          if (userLetter && letters[correctOptIdx] === userLetter) {
            return true;
          }
        }
      }

      return false;
    }

    if (type === 'SCRAMBLE') {
      return cleanUser === cleanCorrect;
    }

    if (type === 'WORD_SEARCH') {
      // Split by comma or whitespace, sort words and compare set
      const userWords = cleanUser.split(' ').filter(Boolean).sort();
      const correctWords = cleanCorrect.split(' ').filter(Boolean).sort();

      if (userWords.length === correctWords.length) {
        const allMatch = userWords.every((w, idx) => w === correctWords[idx]);
        if (allMatch) return true;
      }

      const userWordSet = new Set(userWords);
      const correctWordSet = new Set(correctWords);
      if (userWordSet.size === correctWordSet.size) {
        for (const cw of correctWordSet) {
          if (!userWordSet.has(cw)) return false;
        }
        return true;
      }

      return false;
    }

    if (type === 'GUESS') {
      const cgUser = this.cleanGuessText(userAnswer);
      const cgCorrect = this.cleanGuessText(correctAnswer);

      if (cgUser === cgCorrect) {
        return true;
      }

      if (cgUser.length >= 3 && cgCorrect.length >= 3) {
        if (cgUser.includes(cgCorrect) || cgCorrect.includes(cgUser)) {
          return true;
        }
      }

      return false;
    }

    return cleanUser === cleanCorrect;
  }

  /**
   * Submit an answer to a question.
   */
  async submitAnswer(memberId: string, tenantId: string, data: { questionId: string; answer: string }) {
    const parsed = submitAnswerSchema.parse(data);
    const { questionId, answer } = parsed;

    // 1. Fetch the question
    const question = await prisma.bibleQuestion.findFirst({
      where: { id: questionId, tenantId },
    });
    if (!question) {
      throw new Error('Pertanyaan tidak ditemukan');
    }

    // 2. Check if already attempted
    const existingAttempt = await prisma.bibleGameAttempt.findUnique({
      where: {
        memberId_questionId: {
          memberId,
          questionId,
        },
      },
    });
    if (existingAttempt) {
      throw new Error('Anda sudah menjawab pertanyaan ini');
    }

    // 3. Verify answer with intelligent tolerant matching
    const isCorrect = this.checkAnswerMatch(question.type, answer, question.correctAnswer, question.options);
    const pointsEarned = isCorrect ? question.points : 0;

    // 4. Save attempt
    const attempt = await prisma.bibleGameAttempt.create({
      data: {
        tenantId,
        memberId,
        questionId,
        isCorrect,
        pointsEarned,
      },
    });

    // 5. Calculate daily streak and update score
    let score = await prisma.memberGameScore.findUnique({
      where: { memberId },
    });

    const todayStr = this.getJakartaTodayStr();
    const today = new Date(`${todayStr}T00:00:00.000+07:00`);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

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
          // Already played today, streak remains the same
          newStreak = score.currentStreak;
        } else if (lastPlayedStr === yesterdayStr) {
          // Played yesterday, increment streak
          newStreak = score.currentStreak + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      }

      const maxStreak = Math.max(score.maxStreak, newStreak);

      score = await prisma.memberGameScore.update({
        where: { memberId },
        data: {
          totalPoints: score.totalPoints + pointsEarned,
          currentStreak: newStreak,
          maxStreak,
          lastPlayedAt: new Date(),
        },
      });
    } else {
      score = await prisma.memberGameScore.create({
        data: {
          tenantId,
          memberId,
          totalPoints: pointsEarned,
          currentStreak: newStreak,
          maxStreak: newStreak,
          lastPlayedAt: new Date(),
        },
      });
    }

    return {
      isCorrect,
      pointsEarned,
      correctAnswer: question.correctAnswer,
      passageReference: question.passageReference,
      totalPoints: score.totalPoints,
      currentStreak: score.currentStreak,
    };
  }

  /**
   * Get member's game stats and global rank.
   */
  async getGameProfile(memberId: string, tenantId: string) {
    let score = await prisma.memberGameScore.findUnique({
      where: { memberId },
    });

    if (!score) {
      // Return defaults if never played
      return {
        totalPoints: 0,
        currentStreak: 0,
        maxStreak: 0,
        rank: '-',
      };
    }

    // Calculate rank: count members in same tenant with higher total points + 1
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

  /**
   * Get leaderboard for a tenant.
   */
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
}
