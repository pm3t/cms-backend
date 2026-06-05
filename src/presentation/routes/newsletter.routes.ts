import { Router } from 'express';
import { newsletterController } from '../controllers/newsletter.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const newsletterRouter = Router();

newsletterRouter.use(authenticateJWT);
newsletterRouter.use(SubscriptionGate);
newsletterRouter.use(FeatureGate('newsletter'));

newsletterRouter.get('/', newsletterController.list);
newsletterRouter.get('/:id', newsletterController.get);
newsletterRouter.post('/', newsletterController.create);
newsletterRouter.put('/:id', newsletterController.update);
newsletterRouter.delete('/:id', newsletterController.delete);

export default newsletterRouter;
