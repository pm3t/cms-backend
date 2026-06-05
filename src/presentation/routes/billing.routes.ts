import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Public Webhook for Xendit (No JWT authentication needed)
router.post('/webhook/xendit', billingController.handleXenditWebhook);

router.use(authenticateJWT);

// Invoice generation (super admin or manual trigger)
router.post('/invoices/generate', billingController.generateInvoice);

// Invoice list & detail for current tenant
router.get('/invoices', billingController.listInvoices);
router.get('/invoices/:id', billingController.getInvoice);

// Send invoice payment link via email
router.post('/invoices/:id/send-email', billingController.sendEmail);

// Plan management
router.get('/plans', billingController.listPlans);
router.post('/upgrade', billingController.upgradePlan);
router.get('/subscription', billingController.getSubscription);
router.delete('/subscription', billingController.cancelSubscription);

export default router;
