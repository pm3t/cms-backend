import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../../prisma';

export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Unauthorized: User context missing' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user || !user.isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
        }

        next();
    } catch (error) {
        console.error('[SuperAdminMiddleware] Error checking super admin status:', error);
        res.status(500).json({ error: 'Internal server error during authorization' });
    }
};
