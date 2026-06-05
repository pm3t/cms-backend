import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/verify-2fa', authController.verify2fa);
authRouter.get('/me', authenticateJWT, authController.me);

export default authRouter;
