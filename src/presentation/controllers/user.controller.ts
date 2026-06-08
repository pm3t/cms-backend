import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserService } from '../../domain/user/user.service';

const userService = new UserService();

export const userController = {
    async listUsers(req: AuthRequest, res: Response) {
        try {
            const tenantId = req.user!.tenantId;
            const users = await userService.listUsers(tenantId);
            res.json(users);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async createUser(req: AuthRequest, res: Response) {
        try {
            const tenantId = req.user!.tenantId;
            const { email, name, password } = req.body;

            if (!email || !name || !password) {
                return res.status(400).json({ error: 'Email, nama, dan password wajib diisi.' });
            }

            const user = await userService.createUser(tenantId, { email, name, password });
            res.status(201).json(user);
        } catch (error: any) {
            // Check if it's a limit error (403) or other error
            if (error.message.includes('Limit tercapai')) {
                return res.status(403).json({ error: error.message });
            }
            res.status(400).json({ error: error.message });
        }
    },

    async deleteUser(req: AuthRequest, res: Response) {
        try {
            const tenantId = req.user!.tenantId;
            const requesterId = req.user!.userId;
            const userId = req.params.id as string;

            await userService.deleteUser(tenantId, userId, requesterId);
            res.json({ success: true, message: 'User berhasil dihapus.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async resetPassword(req: AuthRequest, res: Response) {
        try {
            const tenantId = req.user!.tenantId;
            const userId = req.params.id as string;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ error: 'Password baru wajib diisi.' });
            }

            await userService.resetPassword(tenantId, userId, password);
            res.json({ success: true, message: 'Password berhasil direset.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
