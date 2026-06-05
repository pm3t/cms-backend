import { prisma } from '../../prisma';
import { z } from 'zod';

export const newsletterSchema = z.object({
  title: z.string().min(3),
  content: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  pdfUrl: z.string().url().optional().or(z.literal('')),
  publishDate: z.string().transform(str => new Date(str)).optional(),
  isActive: z.boolean().optional()
});

export class NewsletterService {
  async list(tenantId: string) {
    return prisma.newsletter.findMany({
      where: { tenantId },
      orderBy: { publishDate: 'desc' }
    });
  }

  async get(tenantId: string, id: string) {
    return prisma.newsletter.findFirst({
      where: { id, tenantId }
    });
  }

  async create(tenantId: string, data: any) {
    const parsed = newsletterSchema.parse(data);
    return prisma.newsletter.create({
      data: {
        ...parsed,
        tenantId
      }
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const parsed = newsletterSchema.partial().parse(data);
    return prisma.newsletter.updateMany({
      where: { id, tenantId },
      data: parsed
    });
  }

  async delete(tenantId: string, id: string) {
    return prisma.newsletter.deleteMany({
      where: { id, tenantId }
    });
  }
}
