import { prisma } from '../../prisma';
import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  targetAmount: z.number().optional(),
  startDate: z.string().transform(s => new Date(s)).optional(),
  endDate: z.string().transform(s => new Date(s)).optional().nullable(),
  isActive: z.boolean().optional()
});

export const pledgeSchema = z.object({
  memberId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  startDate: z.string().transform(s => new Date(s)).optional(),
  endDate: z.string().transform(s => new Date(s)).optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE')
});

export const budgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  category: z.string().min(1),
  amount: z.number().nonnegative()
});

export class FinanceAdvancedService {
  // --- Projects ---
  async listProjects(tenantId: string) {
    const projects = await prisma.donationProject.findMany({
      where: { tenantId },
      include: {
        _count: { select: { records: true, pledges: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const aggregates = await prisma.financialRecord.groupBy({
      by: ['projectId'],
      where: {
        tenantId,
        projectId: { in: projects.map(p => p.id) },
        paymentStatus: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    const collectedMap = new Map<string, number>();
    aggregates.forEach(agg => {
      if (agg.projectId) {
        collectedMap.set(agg.projectId, agg._sum.amount || 0);
      }
    });

    return projects.map(p => ({
      ...p,
      totalCollected: collectedMap.get(p.id) || 0
    }));
  }

  async getProject(tenantId: string, id: string) {
    const project = await prisma.donationProject.findUnique({
      where: { id },
      include: {
        records: { take: 10, orderBy: { date: 'desc' } },
        _count: { select: { records: true, pledges: true } }
      }
    });
    if (!project || project.tenantId !== tenantId) throw new Error('Project not found');
    
    // Calculate progress
    const totalCollected = await prisma.financialRecord.aggregate({
      where: { projectId: id, paymentStatus: 'COMPLETED' },
      _sum: { amount: true }
    });

    return {
      ...project,
      totalCollected: totalCollected._sum.amount || 0
    };
  }

  async createProject(tenantId: string, data: any) {
    const parsed = projectSchema.parse(data);
    return prisma.donationProject.create({
      data: { ...parsed, tenantId }
    });
  }

  async updateProject(tenantId: string, id: string, data: any) {
    const parsed = projectSchema.partial().parse(data);
    return prisma.donationProject.updateMany({
      where: { id, tenantId },
      data: parsed
    });
  }

  // --- Pledges ---
  async listPledges(tenantId: string) {
    return prisma.pledge.findMany({
      where: { tenantId },
      include: {
        member: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createPledge(tenantId: string, data: any) {
    const parsed = pledgeSchema.parse(data);
    return prisma.pledge.create({
      data: { ...parsed, tenantId }
    });
  }

  async getPledgeProgress(tenantId: string, id: string) {
    const pledge = await prisma.pledge.findUnique({
      where: { id },
      include: { member: true, project: true }
    });
    if (!pledge || pledge.tenantId !== tenantId) throw new Error('Pledge not found');

    const totalPaid = await prisma.financialRecord.aggregate({
      where: { pledgeId: id, paymentStatus: 'COMPLETED' },
      _sum: { amount: true }
    });

    return {
      ...pledge,
      totalPaid: totalPaid._sum.amount || 0,
      remaining: Math.max(0, pledge.amount - (totalPaid._sum.amount || 0))
    };
  }

  // --- Budgets ---
  async listBudgets(tenantId: string, year: number) {
    return prisma.budget.findMany({
      where: { tenantId, year },
      orderBy: [{ month: 'asc' }, { category: 'asc' }]
    });
  }

  async setBudget(tenantId: string, data: any) {
    const parsed = budgetSchema.parse(data);
    return prisma.budget.upsert({
      where: {
        tenantId_year_month_category: {
          tenantId,
          year: parsed.year,
          month: (parsed.month ?? null) as any,
          category: parsed.category
        }
      },
      update: { amount: parsed.amount },
      create: { ...parsed, tenantId }
    });
  }

  async getBudgetVariance(tenantId: string, year: number, month?: number) {
    const budgets = await prisma.budget.findMany({
      where: { tenantId, year, month: month ?? null }
    });

    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = new Date(year, month ? month : 12, 0, 23, 59, 59);

    const actuals = await prisma.financialRecord.groupBy({
      by: ['category'],
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
        type: 'EXPENSE',
        paymentStatus: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    return budgets.map(b => {
      const actual = actuals.find(a => a.category === b.category)?._sum.amount || 0;
      return {
        category: b.category,
        budgeted: b.amount,
        actual,
        variance: b.amount - actual,
        percentUsed: b.amount > 0 ? (actual / b.amount) * 100 : 0
      };
    });
  }
}
