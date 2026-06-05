import { Router } from 'express';
import { digitalController } from '../controllers/digital.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const digitalRouter = Router();

digitalRouter.use(authenticateJWT);
digitalRouter.use(SubscriptionGate);
digitalRouter.use(FeatureGate('digital_ministry'));

digitalRouter.get('/sermons', digitalController.getSermons);
digitalRouter.post('/sermons', digitalController.createSermon);
digitalRouter.delete('/sermons/:id', digitalController.deleteSermon);

digitalRouter.get('/bulletins', digitalController.getBulletins);
digitalRouter.post('/bulletins', digitalController.createBulletin);
digitalRouter.delete('/bulletins/:id', digitalController.deleteBulletin);

digitalRouter.get('/config', digitalController.getConfig);
digitalRouter.put('/config', digitalController.updateConfig);
digitalRouter.post('/config/apikey', digitalController.generateApiKey);

export default digitalRouter;
