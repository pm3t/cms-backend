import { prisma } from '../../prisma';
import { z } from 'zod';

export const devotionSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  scriptureReference: z.string().min(1, 'Nats Alkitab wajib diisi'),
  passageText: z.string().optional().nullable(),
  content: z.string().min(1, 'Isi renungan wajib diisi'),
  author: z.string().default('Tim Pastoral'),
  publishDate: z.string().transform((str) => new Date(str)),
});

export const biblePlanSchema = z.object({
  title: z.string().min(1, 'Nama rencana wajib diisi'),
  description: z.string().optional().nullable(),
  durationDays: z.number().int().min(1),
  days: z.array(
    z.object({
      dayNumber: z.number().int().min(1),
      scripturePassage: z.string().min(1),
    })
  ),
});

export class DevotionService {
  // --- Daily Devotions ---
  async getDevotions(tenantId: string, query?: { search?: string; startDate?: string; endDate?: string }) {
    const whereClause: any = { tenantId };

    if (query?.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { scriptureReference: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.startDate || query?.endDate) {
      whereClause.publishDate = {};
      if (query.startDate) whereClause.publishDate.gte = new Date(query.startDate);
      if (query.endDate) whereClause.publishDate.lte = new Date(query.endDate);
    }

    return prisma.dailyDevotion.findMany({
      where: whereClause,
      orderBy: { publishDate: 'desc' },
    });
  }

  async getDevotionById(tenantId: string, id: string) {
    const devotion = await prisma.dailyDevotion.findFirst({
      where: { id, tenantId }
    });
    if (!devotion) throw new Error('Renungan tidak ditemukan');
    return devotion;
  }

  async createDevotion(tenantId: string, data: any) {
    const parsed = devotionSchema.parse(data);
    return prisma.dailyDevotion.create({
      data: {
        ...parsed,
        tenantId
      }
    });
  }

  async updateDevotion(tenantId: string, id: string, data: any) {
    const parsed = devotionSchema.parse(data);
    const existing = await this.getDevotionById(tenantId, id);
    return prisma.dailyDevotion.update({
      where: { id: existing.id },
      data: parsed
    });
  }

  async deleteDevotion(tenantId: string, id: string) {
    const existing = await this.getDevotionById(tenantId, id);
    return prisma.dailyDevotion.delete({
      where: { id: existing.id }
    });
  }

  async getTodayDevotion(tenantId: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day')!.value);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const isoDateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    
    const startOfToday = new Date(`${isoDateStr}T00:00:00.000+07:00`);
    const endOfToday = new Date(`${isoDateStr}T23:59:59.999+07:00`);

    // Get devotion specifically for today's date
    const devotion = await prisma.dailyDevotion.findFirst({
      where: {
        tenantId,
        publishDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    if (!devotion) {
      // Fallback: get the most recent devotion published on or before today
      return prisma.dailyDevotion.findFirst({
        where: {
          tenantId,
          publishDate: {
            lte: endOfToday
          }
        },
        orderBy: {
          publishDate: 'desc'
        }
      });
    }

    return devotion;
  }

  // --- Bible Reading Plans ---
  async getBiblePlans(tenantId: string) {
    return prisma.bibleReadingPlan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { days: true, enrollments: true }
        }
      }
    });
  }

  async getBiblePlanById(tenantId: string, id: string) {
    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { id, tenantId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' }
        }
      }
    });
    if (!plan) throw new Error('Rencana baca Alkitab tidak ditemukan');
    return plan;
  }

  async createBiblePlan(tenantId: string, data: any) {
    const parsed = biblePlanSchema.parse(data);
    
    return prisma.bibleReadingPlan.create({
      data: {
        tenantId,
        title: parsed.title,
        description: parsed.description || null,
        durationDays: parsed.durationDays,
        days: {
          createMany: {
            data: parsed.days.map(d => ({
              dayNumber: d.dayNumber,
              scripturePassage: d.scripturePassage
            }))
          }
        }
      },
      include: {
        days: true
      }
    });
  }

  async updateBiblePlan(tenantId: string, id: string, data: any) {
    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { id, tenantId }
    });
    if (!plan) throw new Error('Rencana baca Alkitab tidak ditemukan');

    const parsed = biblePlanSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      // Delete existing days
      await tx.bibleReadingPlanDay.deleteMany({
        where: { planId: id }
      });

      // Update plan metadata and create new days
      return tx.bibleReadingPlan.update({
        where: { id },
        data: {
          title: parsed.title,
          description: parsed.description || null,
          durationDays: parsed.durationDays,
          days: {
            createMany: {
              data: parsed.days.map(d => ({
                dayNumber: d.dayNumber,
                scripturePassage: d.scripturePassage
              }))
            }
          }
        },
        include: {
          days: true
        }
      });
    });
  }

  async deleteBiblePlan(tenantId: string, id: string) {
    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { id, tenantId }
    });
    if (!plan) throw new Error('Rencana baca Alkitab tidak ditemukan');
    return prisma.bibleReadingPlan.delete({
      where: { id }
    });
  }

  // --- Member Progress Tracking (Mobile App) ---
  async enrollInBiblePlan(memberId: string, tenantId: string, planId: string) {
    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { id: planId, tenantId }
    });
    if (!plan) throw new Error('Rencana baca Alkitab tidak ditemukan');

    return prisma.memberReadingProgress.upsert({
      where: {
        memberId_planId: { memberId, planId }
      },
      update: {},
      create: {
        memberId,
        planId,
        completedDays: []
      }
    });
  }

  async getMemberProgress(memberId: string, planId: string) {
    const progress = await prisma.memberReadingProgress.findUnique({
      where: {
        memberId_planId: { memberId, planId }
      },
      include: {
        plan: {
          include: {
            days: { orderBy: { dayNumber: 'asc' } }
          }
        }
      }
    });
    return progress;
  }

  async getMemberAllEnrollments(memberId: string) {
    return prisma.memberReadingProgress.findMany({
      where: { memberId },
      include: {
        plan: {
          include: {
            _count: { select: { days: true } }
          }
        }
      }
    });
  }

  async completeDayInBiblePlan(memberId: string, planId: string, dayNumber: number) {
    const progress = await prisma.memberReadingProgress.findUnique({
      where: { memberId_planId: { memberId, planId } }
    });

    if (!progress) {
      throw new Error('Anda belum mendaftar program rencana baca Alkitab ini');
    }

    const completed = Array.isArray(progress.completedDays) 
      ? (progress.completedDays as number[]) 
      : [];

    if (!completed.includes(dayNumber)) {
      completed.push(dayNumber);
    }

    // Log mobile activity for reading
    prisma.memberActivityLog.create({
      data: {
        tenantId: (await prisma.member.findUnique({ where: { id: memberId }, select: { tenantId: true } }))?.tenantId || '',
        memberId,
        action: `READ_BIBLE_DAY_${dayNumber}`,
        device: 'MOBILE'
      }
    }).catch(err => console.error('Failed to log mobile reading activity:', err));

    return prisma.memberReadingProgress.update({
      where: { id: progress.id },
      data: {
        completedDays: completed,
        lastReadAt: new Date()
      }
    });
  }

  async uncompleteDayInBiblePlan(memberId: string, planId: string, dayNumber: number) {
    const progress = await prisma.memberReadingProgress.findUnique({
      where: { memberId_planId: { memberId, planId } }
    });

    if (!progress) {
      throw new Error('Anda belum mendaftar program rencana baca Alkitab ini');
    }

    let completed = Array.isArray(progress.completedDays) 
      ? (progress.completedDays as number[]) 
      : [];

    completed = completed.filter(d => d !== dayNumber);

    return prisma.memberReadingProgress.update({
      where: { id: progress.id },
      data: {
        completedDays: completed
      }
    });
  }
}
