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

    async listPlans() {
        return prisma.plan.findMany({
            where: { is_active: true },
            orderBy: { price_monthly: 'asc' }
        });
    }

    async changeTenantPlanDirectly(tenantId: string, planId: string) {
        const plan = await prisma.plan.findUnique({
            where: { id: planId }
        });
        if (!plan) throw new Error('Plan not found');

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });
        if (!tenant) throw new Error('Tenant not found');

        const latestSubscription = await prisma.subscription.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        return await prisma.$transaction(async (tx) => {
            await tx.tenant.update({
                where: { id: tenantId },
                data: { planId }
            });

            if (latestSubscription) {
                await tx.subscription.update({
                    where: { id: latestSubscription.id },
                    data: {
                        planId,
                        status: 'active',
                        endDate: nextBillingDate,
                        pendingPlanId: null,
                        pendingPlanEffectiveAt: null,
                        trialEndsAt: null,
                        gracePeriodEndsAt: null,
                        suspendedAt: null,
                        cancelledAt: null
                    }
                });
            } else {
                await tx.subscription.create({
                    data: {
                        tenantId,
                        planId,
                        status: 'active',
                        startDate: now,
                        endDate: nextBillingDate
                    }
                });
            }

            return { message: 'Plan updated successfully', plan: plan.name };
        });
    }

    async backupDatabase(writeStream: any): Promise<void> {
        writeStream.write("-- Eklesia SaaS Database Backup\n");
        writeStream.write(`-- Generated at: ${new Date().toISOString()}\n\n`);
        writeStream.write("SET statement_timeout = 0;\n");
        writeStream.write("SET lock_timeout = 0;\n");
        writeStream.write("SET client_encoding = 'UTF8';\n");
        writeStream.write("SET standard_conforming_strings = on;\n");
        writeStream.write("SET check_function_bodies = false;\n");
        writeStream.write("SET xmloption = content;\n");
        writeStream.write("SET client_min_messages = warning;\n\n");
        writeStream.write("SET session_replication_role = 'replica';\n\n");

        const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE' 
              AND table_name NOT LIKE '_prisma_migrations'
            ORDER BY table_name;
        `);

        for (const tableObj of tables) {
            const tableName = tableObj.table_name;
            writeStream.write(`-- Data for Name: ${tableName};\n`);
            writeStream.write(`TRUNCATE TABLE public."${tableName}" RESTART IDENTITY CASCADE;\n\n`);

            const columns: Array<{ column_name: string; data_type: string }> = await prisma.$queryRawUnsafe(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, tableName);

            const colNames = columns.map(c => `"${c.column_name}"`).join(', ');

            const rows: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`
                SELECT * FROM public."${tableName}";
            `);

            if (rows.length > 0) {
                writeStream.write(`INSERT INTO public."${tableName}" (${colNames}) VALUES\n`);
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const values = columns.map(col => {
                        const val = row[col.column_name];
                        if (val === null || val === undefined) {
                            return 'NULL';
                        }
                        if (typeof val === 'boolean') {
                            return val ? 'TRUE' : 'FALSE';
                        }
                        if (typeof val === 'number') {
                            return val.toString();
                        }
                        if (val instanceof Date) {
                            return `'${val.toISOString()}'`;
                        }
                        if (typeof val === 'object') {
                            return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
                        }
                        return `'${val.toString().replace(/'/g, "''")}'`;
                    }).join(', ');

                    writeStream.write(`(${values})${i === rows.length - 1 ? ';' : ','}\n`);
                }
                writeStream.write('\n');
            }
        }

        writeStream.write("SET session_replication_role = 'origin';\n");
    }
}
