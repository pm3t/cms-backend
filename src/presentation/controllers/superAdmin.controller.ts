import { Request, Response, NextFunction } from 'express';
import { SuperAdminService } from '../../domain/superAdmin/superAdmin.service';

const superAdminService = new SuperAdminService();

export const superAdminController = {
    async listTenants(req: Request, res: Response, next: NextFunction) {
        try {
            const tenants = await superAdminService.listTenants();
            res.json(tenants);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async getTenantDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await superAdminService.getTenantDetails(req.params.id as string);
            res.json(tenant);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async suspendTenant(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await superAdminService.updateTenantStatus(req.params.id as string, 'suspended');
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async activateTenant(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await superAdminService.updateTenantStatus(req.params.id as string, 'active');
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getRevenueSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const summary = await superAdminService.getRevenueSummary();
            res.json(summary);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async listInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const invoices = await superAdminService.listAllInvoices();
            res.json(invoices);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async bulkDeleteTenants(req: Request, res: Response, next: NextFunction) {
        try {
            const { ids } = req.body;
            const result = await superAdminService.bulkDeleteTenants(ids);
            res.json({ message: 'Tenants deleted successfully', result });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async listPlans(req: Request, res: Response, next: NextFunction) {
        try {
            const plans = await superAdminService.listPlans();
            res.json(plans);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async changeTenantPlanDirectly(req: Request, res: Response, next: NextFunction) {
        try {
            const { planId } = req.body;
            if (!planId) return res.status(400).json({ error: 'Plan ID required' });
            
            const result = await superAdminService.changeTenantPlanDirectly(req.params.id as string, planId as string);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async backupDatabase(req: Request, res: Response, next: NextFunction) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            res.setHeader('Content-Disposition', `attachment; filename="backup-${timestamp}.sql"`);
            res.setHeader('Content-Type', 'application/sql');

            await superAdminService.backupDatabase(res);
            res.end();
        } catch (error: any) {
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            } else {
                console.error('Error during database backup streaming:', error);
                res.end();
            }
        }
    }
};
