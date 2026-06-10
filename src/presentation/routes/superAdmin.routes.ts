import { Router } from 'express';
import { superAdminController } from '../controllers/superAdmin.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireSuperAdmin } from '../middlewares/superAdmin.middleware';

const router = Router();

// Protect all super admin routes
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// Revenue and Invoices
router.get('/revenue', superAdminController.getRevenueSummary);
router.get('/invoices', superAdminController.listInvoices);

// Tenants
router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:id', superAdminController.getTenantDetails);
router.patch('/tenants/:id/suspend', superAdminController.suspendTenant);
router.patch('/tenants/:id/activate', superAdminController.activateTenant);
router.post('/tenants/bulk-delete', superAdminController.bulkDeleteTenants);
router.patch('/tenants/:id/plan', superAdminController.changeTenantPlanDirectly);

// Plans
router.get('/plans', superAdminController.listPlans);

// Database Backup
router.get('/backup-db', superAdminController.backupDatabase);

export default router;
