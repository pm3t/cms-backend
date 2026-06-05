import { Router } from 'express';
import { mobileController } from '../controllers/mobile.controller';
import { digitalController } from '../controllers/digital.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { receiptUpload, photoUpload } from '../middlewares/upload.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const mobileRouter = Router();

// Public Mobile Routes (Requires Tenant ID in header 'x-tenant-id')
mobileRouter.post('/auth/register', mobileController.register);
mobileRouter.post('/auth/login', mobileController.login);
mobileRouter.post('/auth/forgot-password', mobileController.forgotPassword);
mobileRouter.post('/auth/reset-password', mobileController.resetPassword);

// Protected Mobile Routes (Requires Bearer token)
// authenticateJWT will place { memberId, tenantId } in req.user
mobileRouter.use(authenticateJWT);
mobileRouter.use(SubscriptionGate);
mobileRouter.use(FeatureGate('mobile_app_integration'));

mobileRouter.get('/profile', mobileController.getProfile);
mobileRouter.put('/profile', mobileController.updateProfile);
mobileRouter.post('/profile/photo', photoUpload.single('file'), mobileController.uploadPhoto);

mobileRouter.get('/families', mobileController.getFamilies);
mobileRouter.post('/families', mobileController.createFamily);
mobileRouter.post('/families/join', mobileController.joinFamily);
mobileRouter.post('/families/leave', mobileController.leaveFamily);

mobileRouter.post('/sacraments', mobileController.addSacrament);
mobileRouter.delete('/sacraments/:id', mobileController.deleteSacrament);

mobileRouter.get('/skills', mobileController.getSkills);
mobileRouter.post('/skills', mobileController.addMemberSkill);
mobileRouter.delete('/skills/:skillId', mobileController.removeMemberSkill);
mobileRouter.post('/skills/custom', mobileController.createAndAddSkill);

mobileRouter.get('/events', mobileController.getUpcomingEvents);
mobileRouter.post('/events/:id/register', mobileController.registerEvent);
mobileRouter.post('/events/:id/checkin', mobileController.checkInEvent);
mobileRouter.get('/sermons', digitalController.getPublicSermons);
mobileRouter.get('/digital-config', digitalController.getPublicConfig);
mobileRouter.post('/giving/upload', receiptUpload.single('file'), mobileController.uploadReceipt);
mobileRouter.post('/giving', mobileController.recordGiving);

// Mobile Prayer Request Routes
mobileRouter.get('/prayers/my', mobileController.getMyPrayers);
mobileRouter.get('/prayers/public', mobileController.getPublicPrayers);
mobileRouter.post('/prayers', mobileController.createMyPrayer);
mobileRouter.post('/prayers/:id/pray', mobileController.prayForRequest);

// Mobile Volunteer Routes
mobileRouter.get('/volunteer', mobileController.getVolunteerRecruitments);
mobileRouter.post('/volunteer/:id/apply', mobileController.applyForVolunteer);
mobileRouter.get('/roster', mobileController.getMyRosters);
mobileRouter.get('/newsletters', mobileController.getNewsletters);
mobileRouter.get('/certificates', mobileController.getCertificates);

export default mobileRouter;

