import { Router } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const tenantRouter = Router();

// Strongly enforce authentication before accessing organization settings
tenantRouter.use(authenticateJWT);

tenantRouter.get('/profile', tenantController.getProfile);
tenantRouter.patch('/profile', tenantController.updateProfile);
tenantRouter.post('/branch', tenantController.addBranch);

export default tenantRouter;
