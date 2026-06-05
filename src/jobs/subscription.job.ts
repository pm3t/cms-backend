import cron from 'node-cron';
import { prisma } from '../prisma';
import { CommunicationService } from '../domain/communication/communication.service';
import { BillingService } from '../domain/billing/billing.service';
import { emailTemplates } from '../domain/billing/emailTemplates';

const communicationService = new CommunicationService();
const billingService = new BillingService();

export function startSubscriptionCronJobs() {
    // Run everyday at 08:00 WIB (01:00 UTC)
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] Starting subscription maintenance jobs...');
        await checkOverdueSubscriptions();
        await checkPendingPlanChanges();
        await checkTrialEndingReminders();
        console.log('[Cron] Subscription maintenance jobs finished.');
    }, {
        timezone: "Asia/Jakarta"
    });
}

/**
 * Handles suspensions, trial endings, and cancellations
 */
async function checkOverdueSubscriptions() {
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
                    console.error(`[Cron] Invoice failed for ${trial.tenant.name}:`, err.message);
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
                        endDate: new Date(now.getFullYear() + 10, now.getMonth()) // dummy far future for free
                    }
                });
                console.log(`[Cron] Tenant ${sub.tenant.name} successfully moved to Free plan after cancellation.`);
            }
        }

    } catch (error) {
        console.error('[Cron Error] checkOverdueSubscriptions failed:', error);
    }
}

/**
 * Handles scheduled downgrades
 */
async function checkPendingPlanChanges() {
    try {
        const now = new Date();
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
                console.log(`[Cron] Applied downgrade for ${sub.tenant.name} to ${sub.pendingPlan?.name}`);
            }
        }
    } catch (error) {
        console.error('[Cron Error] checkPendingPlanChanges failed:', error);
    }
}

/**
 * Sends reminder 3 days before trial ends
 */
async function checkTrialEndingReminders() {
    try {
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
    } catch (error) {
        console.error('[Cron Error] checkTrialEndingReminders failed:', error);
    }
}
