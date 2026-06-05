import { prisma } from '../../prisma';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const transactionSchema = z.object({
    type: z.nativeEnum(TransactionType),
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().default("IDR"),
    exchangeRate: z.number().default(1.0),
    date: z.string().datetime().optional(),
    category: z.string().min(2, "Category is required"),
    description: z.string().min(1, "Description is required"),
    memberId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    pledgeId: z.string().uuid().optional().nullable(),
    paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED']).default('COMPLETED'),
    paymentMethod: z.string().optional(),
    externalId: z.string().optional()
});

export class FinanceService {
    async listTransactions(tenantId: string, filters?: { type?: TransactionType, month?: string, startDate?: string, endDate?: string }) {
        const whereClause: any = { tenantId };

        if (filters?.type) {
            whereClause.type = filters.type;
        }

        if (filters?.startDate || filters?.endDate) {
            whereClause.date = {};
            if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.date.lte = end;
            }
        } else if (filters?.month) {
            // Legacy month filtering
            const startDate = new Date(`${filters.month}-01T00:00:00.000Z`);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
            whereClause.date = {
                gte: startDate,
                lt: endDate
            };
        }

        return prisma.financialRecord.findMany({
            where: whereClause,
            include: { member: { select: { firstName: true, lastName: true } } },
            orderBy: { date: 'desc' }
        });
    }

    async getTransaction(tenantId: string, id: string) {
        const trx = await prisma.financialRecord.findUnique({
            where: { id },
            include: { member: { select: { firstName: true, lastName: true, email: true } } }
        });
        if (!trx || trx.tenantId !== tenantId) throw new Error('Transaction not found');
        return trx;
    }

    async recordTransaction(tenantId: string, data: any) {
        const parsed = transactionSchema.parse(data);

        // Generate a random unique receipt code "TRX-YYYYMMDD-XXXX"
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const receiptCode = `TRX-${dateStr}-${randomStr}`;

        return prisma.financialRecord.create({
            data: {
                tenantId,
                ...parsed,
                memberId: parsed.memberId || null,
                projectId: parsed.projectId || null,
                pledgeId: parsed.pledgeId || null,
                date: parsed.date ? new Date(parsed.date) : new Date(),
                receiptCode
            }
        });
    }

    async getDonorStatement(tenantId: string, memberId: string, year: number) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const records = await prisma.financialRecord.findMany({
            where: {
                tenantId,
                memberId,
                date: { gte: startDate, lte: endDate },
                type: { in: ['OFFERING', 'DONATION'] },
                paymentStatus: 'COMPLETED'
            },
            include: { project: { select: { name: true } } },
            orderBy: { date: 'asc' }
        });

        const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

        return {
            year,
            totalAmount,
            donationCount: records.length,
            records
        };
    }

    async deleteTransaction(tenantId: string, id: string) {
        // Confirm it exists in tenant
        const trx = await prisma.financialRecord.findUnique({ where: { id } });
        if (!trx || trx.tenantId !== tenantId) throw new Error('Transaction not found');

        return prisma.financialRecord.delete({ where: { id } });
    }

    async getSummary(tenantId: string, filters?: { startDate?: string, endDate?: string }) {
        const whereClause: any = { tenantId };

        if (filters?.startDate || filters?.endDate) {
            whereClause.date = {};
            if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.date.lte = end;
            }
        }

        // Fetch all numbers to aggregate based on date constraints
        const records = await prisma.financialRecord.findMany({
            where: whereClause,
            select: { type: true, amount: true, category: true }
        });

        const summary = {
            totalIncome: 0,
            totalExpense: 0,
            netBalance: 0,
            incomeByCategory: {} as Record<string, number>,
            expenseByCategory: {} as Record<string, number>
        };

        records.forEach(r => {
            if (r.type === 'OFFERING' || r.type === 'DONATION') {
                summary.totalIncome += r.amount;
                summary.incomeByCategory[r.category] = (summary.incomeByCategory[r.category] || 0) + r.amount;
            } else if (r.type === 'EXPENSE') {
                summary.totalExpense += r.amount;
                summary.expenseByCategory[r.category] = (summary.expenseByCategory[r.category] || 0) + r.amount;
            }
        });

        summary.netBalance = summary.totalIncome - summary.totalExpense;

        return summary;
    }

    async updateTransactionStatus(tenantId: string, id: string, status: 'PENDING' | 'COMPLETED' | 'FAILED') {
        const trx = await prisma.financialRecord.findUnique({ where: { id } });
        if (!trx || trx.tenantId !== tenantId) throw new Error('Transaction not found');

        return prisma.financialRecord.update({
            where: { id },
            data: { paymentStatus: status }
        });
    }
}
