import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { subscriptionService } from '../../domain/subscription/subscription.service';

export const FeatureGate = (featureKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || !req.user.tenantId) {
                return res.status(401).json({ error: 'Unauthorized: Tenant context is missing.' });
            }

            const { tenantId } = req.user;

            // 1. Check for suspension or expiration first
            const isSuspended = await subscriptionService.getSuspensionStatus(tenantId);
            if (isSuspended) {
                return res.status(402).json({ 
                    error: 'Payment Required', 
                    message: 'Your subscription is suspended or expired. Please update your payment details to continue using the system.' 
                });
            }

            // 2. Check if the specific feature is enabled for their active plan
            const isEnabled = await subscriptionService.isFeatureEnabled(tenantId, featureKey);
            if (!isEnabled) {
                return res.status(403).json({ 
                    error: 'Feature Not Available',
                    message: `The '${featureKey}' feature is not available on your current plan. Please upgrade your subscription to access this feature.` 
                });
            }

            // 3. Feature is active and subscription is valid, proceed
            next();
        } catch (error: any) {
            console.error(`[FeatureGate] Error checking feature '${featureKey}':`, error);
            res.status(500).json({ error: 'Internal server error while verifying subscription features.' });
        }
    };
};

/**
 * Middleware to strictly check for subscription suspension.
 * Use this on routes that don't need specific feature gating but should be blocked if suspended.
 */
export const SubscriptionGate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ error: 'Unauthorized: Tenant context is missing.' });
        }

        const isSuspended = await subscriptionService.getSuspensionStatus(req.user.tenantId);
        if (isSuspended) {
            return res.status(402).json({ 
                error: 'Payment Required', 
                message: 'Your subscription is suspended or expired. Please update your payment details to continue using the system.' 
            });
        }

        next();
    } catch (error: any) {
        console.error(`[SubscriptionGate] Error:`, error);
        res.status(500).json({ error: 'Internal server error while verifying subscription.' });
    }
};
