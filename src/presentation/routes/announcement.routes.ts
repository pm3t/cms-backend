import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const announcementRouter = Router();

announcementRouter.use(authenticateJWT);
announcementRouter.use(SubscriptionGate);
announcementRouter.use(FeatureGate('announcements'));

announcementRouter.get('/', announcementController.list);
announcementRouter.get('/:id', announcementController.get);
announcementRouter.post('/', announcementController.create);
announcementRouter.put('/:id', announcementController.update);
announcementRouter.delete('/:id', announcementController.delete);

export default announcementRouter;
