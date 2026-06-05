import { prisma } from '../../prisma';
import { z } from 'zod';

export const updateTenantProfileSchema = z.object({
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.union([z.literal(''), z.string().email()]).optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    primaryColor: z.string().optional(),
    logoUrl: z.union([z.literal(''), z.string()]).optional(),
});

export class TenantService {
    async getTenantProfile(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { branches: true }
        });
        if (!tenant) throw new Error('Tenant not found');
        return tenant;
    }

    async updateTenantProfile(tenantId: string, data: any) {
        const validatedData = updateTenantProfileSchema.parse(data);
        return await prisma.tenant.update({
            where: { id: tenantId },
            data: validatedData
        });
    }

    async createBranch(tenantId: string, data: { name: string; address?: string; phone?: string }) {
        if (!data.name) throw new Error('Branch name is required');
        return await prisma.branch.create({
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                tenantId
            }
        });
    }
}
