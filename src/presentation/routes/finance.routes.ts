import { Router } from 'express';
import { financeController } from '../controllers/finance.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const financeRouter = Router();

financeRouter.use(authenticateJWT);
financeRouter.use(SubscriptionGate);
financeRouter.use(FeatureGate('online_giving'));

financeRouter.get('/', financeController.list);
financeRouter.get('/summary', financeController.summary);
financeRouter.get('/donor-statement/:memberId', financeController.getDonorStatement);
financeRouter.get('/:id', financeController.get);
financeRouter.post('/', financeController.create);
financeRouter.patch('/:id/status', financeController.updateStatus);
financeRouter.delete('/:id', financeController.delete);

export default financeRouter;
