import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../domain/auth/auth.service';

const authService = new AuthService();

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, name, churchName, tenantId } = req.body;
            if (!email || !password || !name || !tenantId) return res.status(400).json({ error: 'Missing required fields' });

            const { subscriptionService } = await import('../../domain/subscription/subscription.service');
            const isWithinLimit = await subscriptionService.isWithinLimit(tenantId, 'max_users');
            if (!isWithinLimit) {
                return res.status(403).json({ error: 'Upgrade required: You have reached the maximum number of users allowed for your current plan.' });
            }

            const user = await authService.registerUser({ email, password, name, churchName, tenantId });
            res.status(201).json(user);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, tenantId } = req.body;
            if (!email || !password || !tenantId) return res.status(400).json({ error: 'Missing credentials or tenantId' });

            const result = await authService.login(email, password, tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async verify2fa(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, token } = req.body;
            const result = await authService.verify2FA(userId, token);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    },

    async me(req: any, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const profile = await authService.getUserProfile(userId);
            res.json(profile);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
