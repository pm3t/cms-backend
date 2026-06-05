import { Router } from 'express';
import { pastoralController } from '../controllers/pastoral.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const pastoralRouter = Router();

// Enforce JWT Authentication and Subscription Gates across all endpoints
pastoralRouter.use(authenticateJWT);
pastoralRouter.use(SubscriptionGate);
pastoralRouter.use(FeatureGate('pastoral_care'));

// --- Visitations ---
pastoralRouter.get('/visitations', pastoralController.getVisitations);
pastoralRouter.post('/visitations', pastoralController.createVisitation);
pastoralRouter.get('/visitations/:id', pastoralController.getVisitationById);
pastoralRouter.patch('/visitations/:id', pastoralController.updateVisitation);
pastoralRouter.delete('/visitations/:id', pastoralController.deleteVisitation);

// --- Counseling ---
pastoralRouter.get('/counseling', pastoralController.getCounselings);
pastoralRouter.post('/counseling', pastoralController.createCounseling);
pastoralRouter.get('/counseling/:id', pastoralController.getCounselingById);
pastoralRouter.patch('/counseling/:id', pastoralController.updateCounseling);
pastoralRouter.delete('/counseling/:id', pastoralController.deleteCounseling);

// --- Prayer Requests ---
pastoralRouter.get('/prayers', pastoralController.getPrayers);
pastoralRouter.post('/prayers', pastoralController.createPrayer);
pastoralRouter.get('/prayers/:id', pastoralController.getPrayerById);
pastoralRouter.patch('/prayers/:id', pastoralController.updatePrayer);
pastoralRouter.delete('/prayers/:id', pastoralController.deletePrayer);
pastoralRouter.post('/prayers/:id/pray', pastoralController.incrementPrayerCount);

// --- Care Groups ---
pastoralRouter.get('/care-groups', pastoralController.getCareGroups);
pastoralRouter.post('/care-groups', pastoralController.createCareGroup);
pastoralRouter.get('/care-groups/:id', pastoralController.getCareGroupById);
pastoralRouter.patch('/care-groups/:id', pastoralController.updateCareGroup);
pastoralRouter.delete('/care-groups/:id', pastoralController.deleteCareGroup);
pastoralRouter.post('/care-groups/:id/members', pastoralController.addCareGroupMember);
pastoralRouter.delete('/care-groups/:id/members/:memberId', pastoralController.removeCareGroupMember);

// --- Crisis ---
pastoralRouter.get('/crisis', pastoralController.getCrises);
pastoralRouter.post('/crisis', pastoralController.createCrisis);
pastoralRouter.get('/crisis/:id', pastoralController.getCrisisById);
pastoralRouter.patch('/crisis/:id', pastoralController.updateCrisis);
pastoralRouter.delete('/crisis/:id', pastoralController.deleteCrisis);

// --- Emergency Contacts ---
pastoralRouter.get('/emergency-contacts/member/:memberId', pastoralController.getEmergencyContacts);
pastoralRouter.post('/emergency-contacts', pastoralController.createEmergencyContact);
pastoralRouter.patch('/emergency-contacts/:id', pastoralController.updateEmergencyContact);
pastoralRouter.delete('/emergency-contacts/:id', pastoralController.deleteEmergencyContact);

export default pastoralRouter;
