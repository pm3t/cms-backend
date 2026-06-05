import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { subscriptionService } from '../subscription/subscription.service';
import { XenditService } from './xendit.service';
import { CommunicationService } from '../communication/communication.service';
import { emailTemplates } from './emailTemplates';

const xenditService = new XenditService();
const communicationService = new CommunicationService();

// Explicit Prisma types for type-safe access to all Invoice fields
type InvoiceWithTenantAndSub = Prisma.InvoiceGetPayload<{
    include: {
        subscription: { include: { plan: true } };
        tenant: true;
    };
}>;

type InvoiceWithPlan = Prisma.InvoiceGetPayload<{
    include: {
        subscription: { include: { plan: { select: { name: true } } } };
    };
}>;

export class BillingService {
    /**
     * List all active plans and mark the current plan for the tenant
     */
    async listPlans(tenantId: string) {
        const plans = await prisma.plan.findMany({
            where: { is_active: true },
            orderBy: { price_monthly: 'asc' }
        });

        const activePlan = await subscriptionService.getActivePlan(tenantId);

        return plans.map(p => {
            // Transform features from { "key": true } to ["key"], or parse if array of strings
            let featureList: string[] = [];
            if (p.features) {
                if (Array.isArray(p.features)) {
                    featureList = p.features as string[];
                } else if (typeof p.features === 'object') {
                    featureList = Object.keys(p.features as object).filter(k => (p.features as any)[k] === true);
                }
            }

            return {
                id: p.id,
                name: p.name,
                priceMonthly: parseFloat(p.price_monthly.toString()),
                priceYearly: parseFloat(p.price_yearly.toString()),
                maxMembers: p.max_members,
                maxUsers: p.max_users,
                features: featureList,
                is_active: p.is_active,
                is_current_plan: p.id === activePlan.id
            };
        });
    }

    /**
     * Get active subscription details for a tenant
     */
    async getSubscription(tenantId: string) {
        // Debug: Find ANY subscription first to see if it even exists
        const sub = await prisma.subscription.findFirst({
            where: { tenantId },
            include: { 
                plan: true,
                pendingPlan: true 
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!sub) throw new Error('No active subscription found.');

        // Helper to format plan to camelCase
        const formatPlan = (p: any) => {
            if (!p) return null;
            let featureList: string[] = [];
            if (p.features) {
                if (Array.isArray(p.features)) {
                    featureList = p.features as string[];
                } else if (typeof p.features === 'object') {
                    featureList = Object.keys(p.features as object).filter(k => (p.features as any)[k] === true);
                }
            }
            return {
                id: p.id,
                name: p.name,
                priceMonthly: parseFloat(p.price_monthly.toString()),
                priceYearly: parseFloat(p.price_yearly.toString()),
                maxMembers: p.max_members,
                maxUsers: p.max_users,
                features: featureList
            };
        };

        return {
            id: sub.id,
            plan: formatPlan(sub.plan),
            status: sub.status,
            trialEndsAt: sub.trialEndsAt,
            endDate: sub.endDate,
            pendingPlanId: sub.pendingPlanId,
            pendingPlanEffectiveAt: sub.pendingPlanEffectiveAt,
            pendingPlan: formatPlan(sub.pendingPlan)
        };
    }

    /**
     * Manage plan changes (Upgrade/Downgrade/Free)
     */
    async upgradePlan(tenantId: string, newPlanId: string) {
        // Find current subscription (even if cancelled, to allow reactivation/new plan)
        const currentSub = await prisma.subscription.findFirst({
            where: { tenantId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });

        // If NO subscription at all, we'll create one (Onboarding fallback)
        if (!currentSub) {
            const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
            if (!newPlan) throw new Error('Plan not found.');

            const now = new Date();
            const oneMonthFromNow = new Date();
            oneMonthFromNow.setMonth(now.getMonth() + 1);

            // Create new invoice and subscription
            // (Similar to registration onboarding)
            const result = await this.generateMonthlyInvoice(tenantId); 
            // Actually, we'll just throw for now to keep it simple, 
            // but we MUST handle the 'cancelled' case below.
            throw new Error('Akun Anda belum memiliki data langganan. Silakan hubungi admin.');
        }

        const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
        if (!newPlan) throw new Error('New plan not found.');

        if (currentSub.planId === newPlanId) {
            throw new Error('Anda sudah menggunakan paket ini.');
        }

        const currentPrice = parseFloat(currentSub.plan.price_monthly.toString());
        const newPrice = parseFloat(newPlan.price_monthly.toString());

        // 0. If CURRENT STATUS IS CANCELLED
        // We treat it as a re-subscription (Immediate activation flow)
        if (currentSub.status === 'cancelled') {
            const invoiceResult = await this.generateMonthlyInvoice(tenantId, undefined, newPlanId);
            
            // Mark the new plan as pending so it activates upon payment
            await prisma.subscription.update({
                where: { id: currentSub.id },
                data: { 
                    pendingPlanId: newPlanId,
                    pendingPlanEffectiveAt: new Date()
                }
            });

            return {
                success: true,
                type: 'reactivation',
                message: `Paket ${newPlan.name} telah dipilih. Silakan lakukan pembayaran untuk mengaktifkan kembali akun Anda.`,
                paymentUrl: (invoiceResult as any).paymentUrl,
                invoice: (invoiceResult as any).invoice
            };
        }

        // 1. If moving to Free plan
        if (newPlan.name === 'Free') {
            await prisma.subscription.update({
                where: { id: currentSub.id },
                data: {
                    status: 'cancelled',
                    cancelledAt: new Date()
                }
            });

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenant?.email) {
                await communicationService.triggerMockEmail(tenantId, {
                    recipient: tenant.email,
                    subject: 'Konfirmasi Pembatalan Langganan',
                    body: emailTemplates.subscription_cancelled(tenant.name, 'sekarang')
                });
            }

            return { success: true, message: 'Langganan berbayar dibatalkan. Akun beralih ke paket Free.' };
        }

        // 2. If UPGRADE (Higher Price)
        if (newPrice > currentPrice) {
            console.log(`[BillingService] Initiating upgrade for tenant ${tenantId} to ${newPlan.name} (Full payment required)`);
            
            return await prisma.$transaction(async (tx) => {
                // Set as pending plan instead of immediate update
                await tx.subscription.update({
                    where: { id: currentSub.id },
                    data: { 
                        pendingPlanId: newPlanId,
                        pendingPlanEffectiveAt: new Date()
                    }
                });

                // Generate invoice for the FULL new plan price
                const invoiceResult = await this.generateMonthlyInvoice(tenantId, tx, newPlanId);
                
                return {
                    success: true,
                    type: 'upgrade',
                    message: `Invoice untuk paket ${newPlan.name} telah dibuat. Silakan selesaikan pembayaran.`,
                    paymentUrl: invoiceResult.paymentUrl,
                    invoice: invoiceResult.invoice
                };
            });
        }

        // 3. If DOWNGRADE (Lower Price)
        // Schedule for next period
        await prisma.subscription.update({
            where: { id: currentSub.id },
            data: {
                pendingPlanId: newPlanId,
                pendingPlanEffectiveAt: currentSub.endDate
            }
        });

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.email) {
            await communicationService.triggerMockEmail(tenantId, {
                recipient: tenant.email,
                subject: 'Konfirmasi Downgrade Terjadwal',
                body: emailTemplates.downgrade_scheduled(
                    tenant.name,
                    currentSub.plan.name,
                    newPlan.name,
                    currentSub.endDate.toLocaleDateString('id-ID')
                )
            });
        }

        return {
            success: true,
            type: 'downgrade',
            message: `Downgrade ke ${newPlan.name} dijadwalkan pada ${currentSub.endDate.toLocaleDateString('id-ID')}.`
        };
    }

    /**
     * Cancel subscription at end of period
     */
    async cancelSubscription(tenantId: string) {
        const currentSub = await prisma.subscription.findFirst({
            where: { tenantId, status: { not: 'cancelled' } },
            orderBy: { createdAt: 'desc' }
        });

        if (!currentSub) throw new Error('No active subscription found.');

        await prisma.subscription.update({
            where: { id: currentSub.id },
            data: {
                cancelledAt: currentSub.endDate
            }
        });

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.email) {
            await communicationService.triggerMockEmail(tenantId, {
                recipient: tenant.email,
                subject: 'Konfirmasi Pembatalan Langganan',
                body: emailTemplates.subscription_cancelled(tenant.name, currentSub.endDate.toLocaleDateString('id-ID'))
            });
        }

        return { success: true, message: `Langganan dibatalkan, efektif pada ${currentSub.endDate.toLocaleDateString('id-ID')}.` };
    }

    /**
     * Handle successful payment notification from Xendit.
     * Updates invoice status and finalizes any pending plan changes.
     */
    async handleInvoicePaid(xenditInvoiceId: string, paidAt: Date) {
        console.log(`[BillingService] Handling paid invoice: ${xenditInvoiceId}`);

        const invoice = await prisma.invoice.findFirst({
            where: { xenditInvoiceId },
            include: { subscription: true }
        });

        if (!invoice) throw new Error(`Invoice ${xenditInvoiceId} not found.`);
        if (invoice.status === 'paid') return invoice; // Already processed

        return await prisma.$transaction(async (tx) => {
            // 1. Update invoice status
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'paid',
                    paidAt
                }
            });

            // 2. Finalize pending plan if it exists
            if (invoice.subscription?.pendingPlanId) {
                console.log(`[BillingService] Finalizing upgrade for tenant ${invoice.tenantId} to plan ${invoice.subscription.pendingPlanId}`);
                
                const nextBillingDate = new Date();
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

                await tx.subscription.update({
                    where: { id: invoice.subscriptionId! },
                    data: {
                        planId: invoice.subscription.pendingPlanId,
                        status: 'active', // Mark as active now
                        endDate: nextBillingDate, // Set new billing date
                        pendingPlanId: null,
                        pendingPlanEffectiveAt: null,
                        trialEndsAt: null // Trial is over now that they paid
                    }
                });
            }

            return updatedInvoice;
        });
    }

    /**
     * Generate a monthly invoice for a tenant, then create Xendit invoice.
     * Skips if tenant is on Free plan.
     */
    async generateMonthlyInvoice(tenantId: string, txClient?: any, targetPlanId?: string, customAmount?: number) {
        const db = txClient || prisma;
        
        // If targetPlanId is provided (e.g. for upgrade), use it, otherwise get active plan
        let plan;
        if (targetPlanId) {
            plan = await db.plan.findUnique({ where: { id: targetPlanId } });
        } else {
            plan = await subscriptionService.getActivePlan(tenantId);
        }

        if (!plan || plan.name === 'Free') {
            return { skipped: true, reason: 'Free plan tenants are not billed.' };
        }

        const subscription = await db.subscription.findFirst({
            where: {
                tenantId,
                status: { in: ['active', 'trialing', 'cancelled', 'past_due'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!subscription) {
            throw new Error('No active subscription found for this tenant.');
        }

        const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new Error('Tenant not found.');

        // Use customAmount if provided (for upgrades), otherwise use full plan price
        const amount = customAmount !== undefined ? customAmount : parseFloat(plan.price_monthly.toString());
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // 1. Create invoice record in DB (status: pending)
        const invoice = await db.invoice.create({
            data: {
                tenantId,
                subscriptionId: subscription.id,
                amount,
                status: 'pending',
                dueDate
            }
        });

        // 2. Create Xendit invoice and update our record
        // Fix email format for Xendit (ensure it has a valid TLD)
        const xenditEmail = tenant.email && tenant.email.includes('@') 
            ? tenant.email 
            : `${tenantId}@technohub.co.id`;

        const xenditResult = await xenditService.createInvoice({
            tenantId,
            invoiceId: invoice.id,
            amount,
            description: `Subscription - Plan ${plan.name} for ${tenant.name}`,
            payerEmail: xenditEmail,
            payerName: tenant.name
        });

        // 3. Update the invoice with Xendit details using the same DB client
        await db.invoice.update({
            where: { id: invoice.id },
            data: {
                xenditInvoiceId: xenditResult.xenditInvoiceId,
                invoiceUrl: xenditResult.invoiceUrl,
                xenditExpiryAt: xenditResult.expiryDate
            }
        });

        // 4. Send notification email (non-blocking)
        this.sendInvoiceEmail(tenantId, invoice.id).catch(err => console.error('Failed to send invoice email:', err));

        // 5. Return the full updated invoice
        const updatedInvoice = await db.invoice.findUnique({
            where: { id: invoice.id },
            include: { subscription: { include: { plan: true } } }
        });

        return {
            invoice: updatedInvoice,
            paymentUrl: xenditResult.invoiceUrl,
            expiryDate: xenditResult.expiryDate
        };
    }

    /**
     * Send invoice payment link email to tenant's billing contact
     */
    async sendInvoiceEmail(tenantId: string, invoiceId: string) {
        const rawInvoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId }
        });
        if (!rawInvoice) throw new Error('Invoice not found.');

        const invoiceWithRelations = await prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                subscription: { include: { plan: true } },
                tenant: true
            }
        }) as InvoiceWithTenantAndSub | null;

        if (!invoiceWithRelations) throw new Error('Invoice not found.');

        const recipientEmail = invoiceWithRelations.tenant.email || `billing@${tenantId}.cms`;
        const planName = invoiceWithRelations.subscription?.plan?.name || 'Subscription';
        const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(parseFloat(invoiceWithRelations.amount.toString()));

        const paymentUrl = (rawInvoice as any).invoiceUrl;

        await communicationService.triggerMockEmail(tenantId, {
            recipient: recipientEmail,
            subject: `Tagihan Langganan CMS - ${planName} - ${formattedAmount}`,
            body: emailTemplates.invoice_created(
                invoiceWithRelations.tenant.name,
                planName,
                formattedAmount,
                invoiceWithRelations.dueDate.toLocaleDateString('id-ID'),
                paymentUrl
            )
        });

        return { sent: true, recipient: recipientEmail };
    }

    /**
     * List all invoices for a tenant
     */
    async listInvoices(tenantId: string): Promise<any[]> {
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            include: {
                subscription: { include: { plan: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return invoices.map(inv => ({
            ...inv,
            amount: parseFloat(inv.amount.toString())
        }));
    }

    /**
     * Get a single invoice with Xendit status sync
     */
    async getInvoiceById(tenantId: string, invoiceId: string) {
        const rawInvoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                subscription: { include: { plan: true } },
                tenant: { select: { id: true, name: true, email: true } }
            }
        });

        if (!rawInvoice) throw new Error('Invoice not found.');

        const xenditInvoiceId = (rawInvoice as any).xenditInvoiceId as string | null;

        // Optionally sync status from Xendit if still pending
        if (xenditInvoiceId && rawInvoice.status === 'pending') {
            try {
                const xenditStatus = await xenditService.getInvoiceStatus(xenditInvoiceId);

                if (xenditStatus.status === 'PAID') {
                    await prisma.invoice.update({
                        where: { id: rawInvoice.id },
                        data: { status: 'paid', paidAt: new Date() }
                    });
                    rawInvoice.status = 'paid';
                    rawInvoice.paidAt = new Date();
                } else if (xenditStatus.status === 'EXPIRED') {
                    await prisma.invoice.update({
                        where: { id: rawInvoice.id },
                        data: { status: 'failed' }
                    });
                    rawInvoice.status = 'failed';
                }
            } catch (err) {
                console.warn('[BillingService] Could not sync Xendit status:', err);
            }
        }

        // Return fresh data with relations
        return {
            ...rawInvoice,
            amount: parseFloat(rawInvoice.amount.toString())
        };
    }

    /**
     * Sync all pending invoices status from Xendit (for cron job usage)
     */
    async syncPendingInvoices(tenantId?: string) {
        const where: Prisma.InvoiceWhereInput = {
            status: 'pending'
        };
        if (tenantId) where.tenantId = tenantId;

        const pendingInvoices = await prisma.invoice.findMany({ where });

        const results = await Promise.allSettled(
            pendingInvoices.map(async (inv) => {
                const xenditId = (inv as any).xenditInvoiceId as string | null;
                if (!xenditId) return { id: inv.id, skipped: true };

                const xenditStatus = await xenditService.getInvoiceStatus(xenditId);
                if (xenditStatus.status === 'PAID') {
                    await prisma.invoice.update({
                        where: { id: inv.id },
                        data: { status: 'paid', paidAt: new Date() }
                    });
                } else if (xenditStatus.status === 'EXPIRED') {
                    await prisma.invoice.update({
                        where: { id: inv.id },
                        data: { status: 'failed' }
                    });
                }
                return { id: inv.id, newStatus: xenditStatus.status };
            })
        );

        return results;
    }
}
