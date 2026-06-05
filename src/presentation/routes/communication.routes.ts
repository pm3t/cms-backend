import { Router } from 'express';
import { communicationController } from '../controllers/communication.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const communicationRouter = Router();

communicationRouter.use(authenticateJWT);
communicationRouter.use(SubscriptionGate);
communicationRouter.use(FeatureGate('bulk_messaging'));

// Templates
communicationRouter.get('/templates', communicationController.listTemplates);
communicationRouter.post('/templates', communicationController.createTemplate);
communicationRouter.put('/templates/:id', communicationController.updateTemplate);
communicationRouter.delete('/templates/:id', communicationController.deleteTemplate);

// Logs & Send
communicationRouter.get('/logs', communicationController.listLogs);
communicationRouter.post('/send', communicationController.triggerEmail);
communicationRouter.post('/bulk', communicationController.sendBulk);

export default communicationRouter;
