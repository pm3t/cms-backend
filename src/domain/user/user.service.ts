import { prisma } from '../../prisma';
import bcrypt from 'bcrypt';

export class UserService {
    /**
     * List all admin users for a tenant
     */
    async listUsers(tenantId: string) {
        return prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                email: true,
                name: true,
                is2FAEnabled: true,
                createdAt: true,
                role: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Create a new admin user for a tenant with plan enforcement
     */
    async createUser(tenantId: string, data: { email: string; name: string; password: string }) {
        // 1. Get current subscription and its plan limit
        const sub = await prisma.subscription.findFirst({
            where: { tenantId, status: { not: 'cancelled' } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!sub) throw new Error('No active subscription found. Cannot add users.');

        const maxUsers = sub.plan.max_users;

        // 2. Count current users if limit exists
        if (maxUsers !== null) {
            const currentCount = await prisma.user.count({ where: { tenantId } });
            if (currentCount >= maxUsers) {
                throw new Error(`Limit tercapai: Paket ${sub.plan.name} Anda hanya mengizinkan maksimal ${maxUsers} user admin.`);
            }
        }

        // 3. Create the user
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        // Find default admin role if exists, or use a generic one
        const adminRole = await prisma.role.findFirst({
            where: { name: { contains: 'Admin' } }
        });

        return prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashedPassword,
                tenantId: tenantId,
                roleId: adminRole?.id
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true
            }
        });
    }

    /**
     * Delete an admin user for a tenant
     */
    async deleteUser(tenantId: string, userId: string, requesterId: string) {
        if (userId === requesterId) {
            throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
        }

        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId }
        });

        if (!user) throw new Error('User tidak ditemukan.');

        return prisma.user.delete({
            where: { id: userId }
        });
    }

    /**
     * Reset password of an admin user for a tenant
     */
    async resetPassword(tenantId: string, userId: string, newPassword: string) {
        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId }
        });

        if (!user) throw new Error('User tidak ditemukan.');

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        return prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
    }
}
