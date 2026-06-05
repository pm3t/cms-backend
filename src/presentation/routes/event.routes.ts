import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { FeatureGate } from '../middlewares/featureGate.middleware';

const router = Router();

// Public endpoints for registration
router.get('/public/:id', eventController.publicInfo);
router.post('/:id/register', eventController.register);

// Protected routes
router.use(authenticateJWT);
router.use(FeatureGate('event_management'));
router.get('/', eventController.list);
router.post('/', eventController.create);
router.get('/:id', eventController.details);
router.put('/:id', eventController.update);
router.delete('/:id', eventController.remove);

// Checkin & Reminders
router.patch('/:eventId/registrations/:id/checkin', eventController.checkin);
router.post('/:id/remind-all', eventController.remindAll);

export default router;
