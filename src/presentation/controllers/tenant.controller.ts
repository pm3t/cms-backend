import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../../domain/organization/tenant.service';

const tenantService = new TenantService();

export const tenantController = {
    async getProfile(req: any, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user.tenantId; // From auth.middleware
            const profile = await tenantService.getTenantProfile(tenantId);
            res.json(profile);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async updateProfile(req: any, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user.tenantId;
            const updated = await tenantService.updateTenantProfile(tenantId, req.body);
            res.json(updated);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors }); // Zod validation error
            res.status(400).json({ error: error.message });
        }
    },

    async addBranch(req: any, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user.tenantId;
            const branch = await tenantService.createBranch(tenantId, req.body);
            res.status(201).json(branch);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
