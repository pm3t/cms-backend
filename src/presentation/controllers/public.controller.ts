import { Request, Response } from 'express';
import { prisma } from '../../prisma';
import { GivingService } from '../../domain/finance/giving.service';

const givingService = new GivingService();

export const publicController = {
    async getChurchInfo(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { id },
                        { websitePath: id }
                    ]
                },
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

    async getChurchWebsiteData(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { id },
                        { websitePath: id }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    primaryColor: true,
                    address: true,
                    phone: true,
                    email: true,
                    websiteActive: true,
                    websitePath: true,
                    websiteTheme: true,
                }
            });
            if (!tenant) return res.status(404).json({ error: 'Church not found' });
            if (!tenant.websiteActive) {
                return res.status(403).json({ error: 'Website untuk gereja ini belum diaktifkan.' });
            }

            const tenantId = tenant.id;

            const config = await prisma.digitalConfig.findUnique({
                where: { tenantId },
                select: {
                    liveStreamUrl: true
                }
            });

            const sermons = await prisma.sermon.findMany({
                where: { tenantId, isPublished: true },
                orderBy: { date: 'desc' }
            });

            const bulletins = await prisma.bulletin.findMany({
                where: { tenantId, isPublished: true },
                orderBy: { date: 'desc' }
            });

            const devotions = await prisma.dailyDevotion.findMany({
                where: { tenantId, publishDate: { lte: new Date() } },
                orderBy: { publishDate: 'desc' },
                take: 5
            });

            const biblePlans = await prisma.bibleReadingPlan.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                include: {
                    days: {
                        orderBy: { dayNumber: 'asc' }
                    }
                }
            });

            const events = await prisma.event.findMany({
                where: { tenantId, endDate: { gte: new Date() } },
                orderBy: { startDate: 'asc' }
            });

            res.json({
                tenant,
                config,
                sermons,
                bulletins,
                devotions,
                biblePlans,
                events
            });
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
