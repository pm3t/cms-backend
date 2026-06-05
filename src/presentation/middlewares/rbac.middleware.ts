import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../../prisma';

export const requirePermission = (requiredPermission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || !req.user.roleId) {
                return res.status(403).json({ error: 'Access denied: No role assigned' });
            }

            // We should ideally cache this or pass via token payload for efficiency,
            // but for granular security, checking live DB ensures revoked perms are immediate.
            const hasPerm = await prisma.rolePermission.findFirst({
                where: {
                    roleId: req.user.roleId,
                    permission: {
                        name: requiredPermission
                    }
                }
            });

            if (!hasPerm) {
                return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error during authorization' });
        }
    };
};
