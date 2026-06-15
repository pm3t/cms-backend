import { Router } from 'express';
import { devotionController } from '../controllers/devotion.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate } from '../middlewares/featureGate.middleware';

const devotionRouter = Router();

devotionRouter.use(authenticateJWT);
devotionRouter.use(SubscriptionGate);

// Admin Devotion Management
devotionRouter.get('/', devotionController.getDevotions);
devotionRouter.get('/:id', devotionController.getDevotionById);
devotionRouter.post('/', devotionController.createDevotion);
devotionRouter.put('/:id', devotionController.updateDevotion);
devotionRouter.delete('/:id', devotionController.deleteDevotion);

// Admin Bible Reading Plan Management
devotionRouter.get('/plans/all', devotionController.getBiblePlans);
devotionRouter.get('/plans/:id', devotionController.getBiblePlanById);
devotionRouter.post('/plans', devotionController.createBiblePlan);
devotionRouter.put('/plans/:id', devotionController.updateBiblePlan);
devotionRouter.delete('/plans/:id', devotionController.deleteBiblePlan);

export default devotionRouter;
