import { Response } from 'express';
import { FinanceService } from '../../domain/finance/finance.service';
import { TransactionType } from '@prisma/client';

const financeService = new FinanceService();

export const financeController = {
    async list(req: any, res: Response) {
        try {
            const filters = {
                type: req.query.type as TransactionType,
                month: req.query.month as string,
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string
            };
            const result = await financeService.listTransactions(req.user.tenantId, filters);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async get(req: any, res: Response) {
        try {
            const result = await financeService.getTransaction(req.user.tenantId, req.params.id);
            res.json(result);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async create(req: any, res: Response) {
        try {
            console.log('[FinanceController] Creating transaction:', JSON.stringify(req.body, null, 2));
            const result = await financeService.recordTransaction(req.user.tenantId, req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async delete(req: any, res: Response) {
        try {
            await financeService.deleteTransaction(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async summary(req: any, res: Response) {
        try {
            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string
            };
            const result = await financeService.getSummary(req.user.tenantId, filters);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getDonorStatement(req: any, res: Response) {
        try {
            const { memberId } = req.params;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const result = await financeService.getDonorStatement(req.user.tenantId, memberId, year);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async updateStatus(req: any, res: Response) {
        try {
            const { status } = req.body;
            if (!['PENDING', 'COMPLETED', 'FAILED'].includes(status)) {
                return res.status(400).json({ error: 'Status tidak valid' });
            }
            const result = await financeService.updateTransactionStatus(req.user.tenantId, req.params.id, status);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
