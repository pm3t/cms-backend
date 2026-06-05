import { prisma } from '../../prisma';

export class SuperAdminService {
    async listTenants() {
        return prisma.tenant.findMany({
            include: {
                subscriptions: {
                    include: {
                        plan: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                },
                _count: {
                    select: { users: true, members: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async getTenantDetails(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                subscriptions: {
                    include: { plan: true },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: {
                    select: { users: true, members: true, families: true, events: true }
                }
            }
        });

        if (!tenant) throw new Error('Tenant not found');
        return tenant;
    }

    async updateTenantStatus(tenantId: string, status: 'active' | 'suspended') {
        const latestSubscription = await prisma.subscription.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestSubscription) {
            throw new Error('Tenant does not have any active subscriptions');
        }

        return prisma.subscription.update({
            where: { id: latestSubscription.id },
            data: { status }
        });
    }

    async getRevenueSummary() {
        // Simple MRR calculation based on active subscriptions
        const activeSubscriptions = await prisma.subscription.findMany({
            where: {
                status: { in: ['active', 'trialing'] },
                endDate: { gte: new Date() }
            },
            include: {
                plan: true
            }
        });

        // Use parseFloat to safely sum Decimal values
        const mrr = activeSubscriptions.reduce((sum, sub) => sum + parseFloat(sub.plan.price_monthly.toString() || '0'), 0);
        const totalActiveTenants = activeSubscriptions.length;
        
        // Count trials (trialEndsAt is in the future)
        const totalTrials = activeSubscriptions.filter(sub => sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()).length;

        // Count churned this month (cancelled or expired this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const churnedTenants = await prisma.subscription.count({
            where: {
                status: { in: ['cancelled', 'past_due'] },
                updatedAt: { gte: startOfMonth }
            }
        });

        return {
            mrr,
            totalActiveTenants,
            totalTrials,
            churnedThisMonth: churnedTenants
        };
    }

    async listAllInvoices() {
        return prisma.invoice.findMany({
            include: {
                tenant: { select: { id: true, name: true } },
                subscription: { include: { plan: { select: { name: true } } } }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });
    }

    async bulkDeleteTenants(ids: string[]) {
        if (!ids || ids.length === 0) return { count: 0 };

        // We use a transaction to ensure all related data is deleted
        // Note: Prisma usually handles cascade if configured in schema, 
        // but explicit deletion is safer for critical data.
        return prisma.$transaction([
            // Deleting in order to satisfy FK constraints
            prisma.invoice.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.subscription.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.user.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.member.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.family.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.event.deleteMany({ where: { tenantId: { in: ids } } }),
            prisma.tenant.deleteMany({ where: { id: { in: ids } } }),
        ]);
    }
}
