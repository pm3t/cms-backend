import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate } from '../middlewares/featureGate.middleware';

const userRouter = Router();

userRouter.use(authenticateJWT);
userRouter.use(SubscriptionGate);

userRouter.get('/', userController.listUsers);
userRouter.post('/', userController.createUser);

export default userRouter;
