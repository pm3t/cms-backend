import { Request, Response } from 'express';
import { prisma } from '../../prisma';
import { GivingService } from '../../domain/finance/giving.service';

const givingService = new GivingService();

export const publicController = {
    async getChurchInfo(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const tenant = await prisma.tenant.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    primaryColor: true,
                    address: true,
                    donationProjects: {
                        where: { isActive: true },
                        select: { id: true, name: true, description: true }
                    }
                }
            });
            if (!tenant) return res.status(404).json({ error: 'Church not found' });
            res.json(tenant);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async createDonation(req: Request, res: Response) {
        try {
            const tenantId = req.params.tenantId as string;
            const result = await givingService.createDonationInvoice(tenantId, req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
