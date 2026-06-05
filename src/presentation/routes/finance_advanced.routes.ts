import { Router } from 'express';
import { financeAdvancedController } from '../controllers/finance_advanced.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const financeAdvancedRouter = Router();

financeAdvancedRouter.use(authenticateJWT);
financeAdvancedRouter.use(SubscriptionGate);
financeAdvancedRouter.use(FeatureGate('finance_advanced'));

// Projects
financeAdvancedRouter.get('/projects', financeAdvancedController.listProjects);
financeAdvancedRouter.get('/projects/:id', financeAdvancedController.getProject);
financeAdvancedRouter.post('/projects', financeAdvancedController.createProject);
financeAdvancedRouter.put('/projects/:id', financeAdvancedController.updateProject);

// Pledges
financeAdvancedRouter.get('/pledges', financeAdvancedController.listPledges);
financeAdvancedRouter.get('/pledges/:id/progress', financeAdvancedController.getPledgeProgress);
financeAdvancedRouter.post('/pledges', financeAdvancedController.createPledge);

// Budgets
financeAdvancedRouter.get('/budgets', financeAdvancedController.listBudgets);
financeAdvancedRouter.get('/budgets/variance', financeAdvancedController.getBudgetVariance);
financeAdvancedRouter.post('/budgets', financeAdvancedController.setBudget);

export default financeAdvancedRouter;
