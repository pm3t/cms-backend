import { prisma } from '../../prisma';

export class SubscriptionService {
    /**
     * Get the active subscription and plan for a tenant.
     * Fallback to 'Free' plan if no active subscription exists.
     */
    async getActivePlan(tenantId: string) {
        // Find the active subscription
        const subscription = await prisma.subscription.findFirst({
            where: {
                tenantId,
                status: { in: ['active', 'trialing'] },
                endDate: { gte: new Date() } // not expired
            },
            include: {
                plan: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (subscription && subscription.plan) {
            return subscription.plan;
        }

        // If no active subscription, return the default Free plan
        const freePlan = await prisma.plan.findFirst({
            where: { name: 'Free' }
        });

        if (!freePlan) {
            throw new Error('Default Free plan not found in database.');
        }

        return freePlan;
    }

    /**
     * Check if a specific feature is enabled in the tenant's current plan
     */
    async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
        const plan = await this.getActivePlan(tenantId);
        
        if (!plan.features) return false;
        
        // Features can be an array of strings or an object
        const features = plan.features as any;
        
        if (Array.isArray(features)) {
            if (features.includes('all_pro_features')) return true;
            return features.includes(featureKey);
        }
        
        if (typeof features === 'object') {
            return !!features[featureKey];
        }

        return false;
    }

    /**
     * Check if the tenant is within the limits of their current plan for a given resource
     */
    async isWithinLimit(tenantId: string, limitKey: 'max_members' | 'max_users' | 'max_storage_gb'): Promise<boolean> {
        const plan = await this.getActivePlan(tenantId);
        
        // Null means unlimited (Enterprise)
        if (plan[limitKey] === null) {
            return true;
        }

        const limit = plan[limitKey] as number;

        if (limitKey === 'max_members') {
            const currentCount = await prisma.member.count({ where: { tenantId } });
            return currentCount < limit;
        }

        if (limitKey === 'max_users') {
            const currentCount = await prisma.user.count({ where: { tenantId } });
            return currentCount < limit;
        }

        // max_storage_gb implementation depends on how storage is tracked.
        // For now, return true or implement logic if storage tracking exists.
        return true;
    }

    /**
     * Check if the tenant's subscription is suspended or expired
     * Returns true if suspended/expired
     */
    async getSuspensionStatus(tenantId: string): Promise<boolean> {
        // Look for the most recent subscription
        const latestSubscription = await prisma.subscription.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestSubscription) {
            // If they never had a subscription, they are on the Free plan, which cannot be suspended.
            return false;
        }

        if (latestSubscription.status === 'suspended' || latestSubscription.status === 'cancelled') {
            return true;
        }

        // If past_due, only suspend if grace period is over
        if (latestSubscription.status === 'past_due') {
            if (latestSubscription.gracePeriodEndsAt && latestSubscription.gracePeriodEndsAt < new Date()) {
                return true;
            }
            // Still in grace period
            return false;
        }

        // For active/trialing, check if endDate has severely passed (failsafe)
        if (latestSubscription.endDate < new Date() && latestSubscription.status !== 'trialing') {
             // In a perfect system, webhook or cron already sets this to past_due.
             // We return true here as a failsafe if endDate is passed and it's not past_due.
             // But wait, actually let's just rely on status. If it's active but endDate passed, 
             // it might be auto-renewing. Let's strictly follow the grace period.
             return false;
        }

        return false;
    }
}

export const subscriptionService = new SubscriptionService();
