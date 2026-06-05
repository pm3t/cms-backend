import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { BillingService } from '../../domain/billing/billing.service';

const billingService = new BillingService();

export const billingController = {
    // POST /billing/invoices/generate
    async generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // Allow super admin to specify tenantId, else use own tenant
            const tenantId = (req as any).query.tenantId || req.user?.tenantId;
            if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

            const result = await billingService.generateMonthlyInvoice(tenantId as string);

            if ('skipped' in result && result.skipped) {
                return res.status(200).json({ message: result.reason });
            }

            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    // GET /billing/invoices
    async listInvoices(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const invoices = await billingService.listInvoices(tenantId);
            res.json(invoices);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    // GET /billing/invoices/:id
    async getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const invoice = await billingService.getInvoiceById(tenantId, req.params.id as string);
            res.json(invoice);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    // POST /billing/invoices/:id/send-email
    async sendEmail(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const result = await billingService.sendInvoiceEmail(tenantId, req.params.id as string);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // GET /billing/plans
    async listPlans(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const plans = await billingService.listPlans(tenantId);
            res.json(plans);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /billing/upgrade
    async upgradePlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const { plan_id } = req.body;
            if (!plan_id) return res.status(400).json({ error: 'Plan ID required' });

            const result = await billingService.upgradePlan(tenantId, plan_id as string);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // DELETE /billing/subscription
    async cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const result = await billingService.cancelSubscription(tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // GET /billing/subscription
    async getSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const result = await billingService.getSubscription(tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    // POST /billing/webhook/xendit
    async handleXenditWebhook(req: Request, res: Response) {
        try {
            const callbackToken = req.headers['x-callback-token'];
            const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

            // Security check
            if (expectedToken && callbackToken !== expectedToken) {
                console.warn('[BillingController] Unauthorized webhook attempt detected.');
                return (res as any).status(401).json({ error: 'Unauthorized' });
            }

            const { id, status, updated, paid_at } = (req as any).body;
            
            console.log(`[BillingController] Received Xendit Webhook for invoice ${id}, status: ${status}`);

            if (status === 'PAID' || status === 'SETTLED') {
                await billingService.handleInvoicePaid(id, new Date(paid_at || updated));
            }

            (res as any).status(200).json({ success: true });
        } catch (error: any) {
            console.error('[BillingController] Webhook Error:', error.message);
            (res as any).status(500).json({ error: error.message });
        }
    }
};
