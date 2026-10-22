import { prisma } from '../../prisma';
import bcrypt from 'bcrypt';
import { AVAILABLE_MODULES } from './modules';

export class UserService {
    /**
     * Get list of all available modules in the application
     */
    getAvailableModules() {
        return AVAILABLE_MODULES;
    }

    /**
     * Ensure permission records exist in the database for all available modules
     */
    private async ensurePermissionsExist() {
        for (const mod of AVAILABLE_MODULES) {
            await prisma.permission.upsert({
                where: { name: mod.key },
                update: { description: mod.description },
                create: {
                    name: mod.key,
                    description: mod.description
                }
            });
        }
    }

    /**
     * List all admin users for a tenant with their assigned module permissions
     */
    async listUsers(tenantId: string) {
        const users = await prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                email: true,
                name: true,
                is2FAEnabled: true,
                isSuperAdmin: true,
                createdAt: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: {
                                permission: {
                                    select: { name: true, description: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const allModuleKeys = AVAILABLE_MODULES.map(m => m.key);

        return users.map(u => {
            let userPermissions: string[] = [];

            if (u.isSuperAdmin) {
                userPermissions = allModuleKeys;
            } else if (u.role && u.role.permissions && u.role.permissions.length > 0) {
                userPermissions = u.role.permissions.map(rp => rp.permission.name);
            } else {
                // Default legacy users without specific role to full access
                userPermissions = allModuleKeys;
            }

            return {
                id: u.id,
                email: u.email,
                name: u.name,
                is2FAEnabled: u.is2FAEnabled,
                isSuperAdmin: u.isSuperAdmin,
                createdAt: u.createdAt,
                roleName: u.isSuperAdmin ? 'Super Admin' : (u.role?.name || 'Administrator'),
                permissions: userPermissions
            };
        });
    }

    /**
     * Create a new admin user for a tenant with customized module access
     */
    async createUser(tenantId: string, data: { 
        email: string; 
        name: string; 
        password: string;
        modules?: string[];
        roleName?: string;
    }) {
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

        // 3. Ensure permissions exist in DB
        await this.ensurePermissionsExist();

        // 4. Determine modules
        const allModuleKeys = AVAILABLE_MODULES.map(m => m.key);
        const selectedModules = (data.modules && data.modules.length > 0) 
            ? data.modules.filter(m => allModuleKeys.includes(m))
            : allModuleKeys;

        const roleTitle = data.roleName?.trim() || (
            selectedModules.length === allModuleKeys.length ? 'Administrator' : `${data.name} (Kustom)`
        );

        // 5. Create a Role for this user's module assignment
        const role = await prisma.role.create({
            data: {
                name: roleTitle,
                tenantId: tenantId
            }
        });

        // 6. Link selected permissions to the role
        for (const modKey of selectedModules) {
            const perm = await prisma.permission.findUnique({ where: { name: modKey } });
            if (perm) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: perm.id
                    }
                });
            }
        }

        // 7. Create the user
        const hashedPassword = await bcrypt.hash(data.password, 10);

        return prisma.user.create({
            data: {
                email: data.email.trim().toLowerCase(),
                name: data.name.trim(),
                password: hashedPassword,
                tenantId: tenantId,
                roleId: role.id
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
     * Update an admin user's details and module access permissions
     */
    async updateUser(tenantId: string, userId: string, data: {
        name?: string;
        email?: string;
        password?: string;
        modules?: string[];
        roleName?: string;
    }) {
        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId },
            include: { role: true }
        });

        if (!user) throw new Error('User tidak ditemukan.');

        await this.ensurePermissionsExist();
        const allModuleKeys = AVAILABLE_MODULES.map(m => m.key);

        let roleId = user.roleId;

        // Update module permissions if specified
        if (data.modules !== undefined) {
            const selectedModules = data.modules.filter(m => allModuleKeys.includes(m));
            const roleTitle = data.roleName?.trim() || (
                selectedModules.length === allModuleKeys.length ? 'Administrator' : `${data.name || user.name} (Kustom)`
            );

            if (!roleId) {
                // Create new role
                const newRole = await prisma.role.create({
                    data: {
                        name: roleTitle,
                        tenantId: tenantId
                    }
                });
                roleId = newRole.id;
            } else {
                // Update existing role name
                await prisma.role.update({
                    where: { id: roleId },
                    data: { name: roleTitle }
                });

                // Clear old permissions
                await prisma.rolePermission.deleteMany({
                    where: { roleId: roleId }
                });
            }

            // Assign new permissions
            for (const modKey of selectedModules) {
                const perm = await prisma.permission.findUnique({ where: { name: modKey } });
                if (perm) {
                    await prisma.rolePermission.create({
                        data: {
                            roleId: roleId,
                            permissionId: perm.id
                        }
                    });
                }
            }
        }

        // Prepare user update data
        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.email) updateData.email = data.email.trim().toLowerCase();
        if (data.password && data.password.trim() !== '') {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        if (roleId) updateData.roleId = roleId;

        return prisma.user.update({
            where: { id: userId },
            data: updateData,
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

        const deleted = await prisma.user.delete({
            where: { id: userId }
        });

        // Clean up role if it was a dedicated role
        if (user.roleId) {
            const usersWithRole = await prisma.user.count({ where: { roleId: user.roleId } });
            if (usersWithRole === 0) {
                await prisma.rolePermission.deleteMany({ where: { roleId: user.roleId } });
                await prisma.role.delete({ where: { id: user.roleId } }).catch(() => {});
            }
        }

        return deleted;
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
