import { prisma } from '../../prisma';
import { z } from 'zod';
import { AnnouncementAudience } from '@prisma/client';

export const createAnnouncementSchema = z.object({
    title: z.string().min(3, "Title too short"),
    content: z.string().min(5, "Content too short"),
    audience: z.nativeEnum(AnnouncementAudience).default('ALL'),
    publishDate: z.string().datetime().optional()
});

export class AnnouncementService {
    async listAnnouncements(tenantId: string) {
        return prisma.announcement.findMany({
            where: { tenantId },
            include: { author: { select: { name: true } } },
            orderBy: { publishDate: 'desc' }
        });
    }

    async getAnnouncement(tenantId: string, id: string) {
        const ann = await prisma.announcement.findUnique({
            where: { id },
            include: { author: { select: { name: true } } }
        });
        if (!ann || ann.tenantId !== tenantId) throw new Error('Announcement not found');
        return ann;
    }

    async createAnnouncement(tenantId: string, authorId: string, data: any) {
        const parsed = createAnnouncementSchema.parse(data);
        return prisma.announcement.create({
            data: {
                tenantId,
                authorId,
                title: parsed.title,
                content: parsed.content,
                audience: parsed.audience,
                publishDate: parsed.publishDate ? new Date(parsed.publishDate) : new Date()
            }
        });
    }

    async updateAnnouncement(tenantId: string, id: string, data: any) {
        const ann = await this.getAnnouncement(tenantId, id);
        const parsed = createAnnouncementSchema.partial().parse(data);
        return prisma.announcement.update({
            where: { id: ann.id },
            data: {
                title: parsed.title,
                content: parsed.content,
                audience: parsed.audience,
                publishDate: parsed.publishDate ? new Date(parsed.publishDate) : undefined
            }
        });
    }

    async deleteAnnouncement(tenantId: string, id: string) {
        const ann = await this.getAnnouncement(tenantId, id);
        return prisma.announcement.delete({ where: { id: ann.id } });
    }
}
