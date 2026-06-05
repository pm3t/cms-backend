import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { CommunicationService } from '../../domain/communication/communication.service';
import { BillingService } from '../../domain/billing/billing.service';
import { emailTemplates } from '../../domain/billing/emailTemplates';

const jobRouter = Router();
const communicationService = new CommunicationService();
const billingService = new BillingService();

// Trigger subscription cleanup job manually or via HTTP cron trigger
jobRouter.post('/subscription-cleanup', async (req: Request, res: Response) => {
    // Basic protection using CRON_SECRET token
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    console.log('[HTTP Cron] Starting subscription maintenance jobs...');
    try {
        const now = new Date();

        // 1. Process 'past_due' (Grace Period check)
        const pastDueSubs = await prisma.subscription.findMany({
            where: { status: 'past_due', gracePeriodEndsAt: { lte: now } },
            include: { tenant: true }
        });

        for (const sub of pastDueSubs) {
            await prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'suspended', suspendedAt: now }
            });

            if (sub.tenant.email) {
                await communicationService.triggerMockEmail(sub.tenantId, {
                    recipient: sub.tenant.email,
                    subject: 'Pemberitahuan Penangguhan Akun CMS',
                    body: emailTemplates.subscription_suspended(sub.tenant.name)
                });
            }
        }

        // 2. Process expired trials
        const expiredTrials = await prisma.subscription.findMany({
            where: { status: 'trialing', trialEndsAt: { lte: now } },
            include: { tenant: true }
        });

        for (const trial of expiredTrials) {
            const gracePeriodEndsAt = new Date();
            gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 7);

            await prisma.subscription.update({
                where: { id: trial.id },
                data: { status: 'past_due', gracePeriodEndsAt }
            });

            const existingInvoice = await prisma.invoice.findFirst({
                where: { subscriptionId: trial.id, status: 'pending' }
            });

            if (!existingInvoice) {
                try {
                    await billingService.generateMonthlyInvoice(trial.tenantId);
                } catch (err: any) {
                    console.error(`[HTTP Cron] Invoice failed for ${trial.tenant.name}:`, err.message);
                }
            }
        }

        // 3. Process Scheduled Cancellations (move to Free)
        const cancelledSubs = await prisma.subscription.findMany({
            where: {
                status: { not: 'cancelled' },
                cancelledAt: { lte: now }
            },
            include: { tenant: true }
        });

        const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } });

        for (const sub of cancelledSubs) {
            if (freePlan) {
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        planId: freePlan.id,
                        status: 'active',
                        cancelledAt: null,
                        endDate: new Date(now.getFullYear() + 10, now.getMonth())
                    }
                });
                console.log(`[HTTP Cron] Tenant ${sub.tenant.name} moved to Free plan.`);
            }
        }

        // 4. Process Scheduled Downgrades
        const pendingChanges = await prisma.subscription.findMany({
            where: {
                pendingPlanId: { not: null },
                pendingPlanEffectiveAt: { lte: now }
            },
            include: { tenant: true, pendingPlan: true }
        });

        for (const sub of pendingChanges) {
            if (sub.pendingPlanId) {
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        planId: sub.pendingPlanId,
                        pendingPlanId: null,
                        pendingPlanEffectiveAt: null
                    }
                });
                console.log(`[HTTP Cron] Applied downgrade for ${sub.tenant.name} to ${sub.pendingPlan?.name}`);
            }
        }

        // 5. Send reminder 3 days before trial ends
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const startOfDay = new Date(threeDaysFromNow.setHours(0,0,0,0));
        const endOfDay = new Date(threeDaysFromNow.setHours(23,59,59,999));

        const trialsEndingSoon = await prisma.subscription.findMany({
            where: {
                status: 'trialing',
                trialEndsAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: { tenant: true }
        });

        for (const trial of trialsEndingSoon) {
            if (trial.tenant.email) {
                await communicationService.triggerMockEmail(trial.tenantId, {
                    recipient: trial.tenant.email,
                    subject: 'Masa Trial Segera Berakhir - Church Management System',
                    body: emailTemplates.trial_ending_reminder(
                        trial.tenant.name, 
                        trial.trialEndsAt!.toLocaleDateString('id-ID')
                    )
                });
            }
        }

        res.json({ success: true, message: 'Jobs completed successfully' });
    } catch (error: any) {
        console.error('[HTTP Cron Error] Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

export default jobRouter;
