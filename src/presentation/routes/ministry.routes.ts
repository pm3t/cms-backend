import { Router } from 'express';
import { MinistryController } from '../controllers/ministry.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateJWT);
router.use(SubscriptionGate);
router.use(FeatureGate('ministry_management'));

// Ministry Groups
router.get('/', MinistryController.getMinistries);
router.post('/', MinistryController.createMinistry);
router.put('/:id', MinistryController.updateMinistry);
router.delete('/:id', MinistryController.deleteMinistry);
router.post('/members', MinistryController.addMember);

// Volunteer Recruitment
router.get('/volunteer', MinistryController.getRecruitments);
router.post('/volunteer', MinistryController.createRecruitment);
router.put('/volunteer/:id', MinistryController.updateRecruitment);
router.delete('/volunteer/:id', MinistryController.deleteRecruitment);
router.get('/volunteer/:recruitmentId/applications', MinistryController.getApplications);
router.patch('/volunteer/applications/:applicationId', MinistryController.updateApplicationStatus);

// Service Roster
router.get('/roster', MinistryController.getRosters);
router.post('/roster', MinistryController.createRoster);
router.put('/roster/:id', MinistryController.updateRoster);
router.delete('/roster/:id', MinistryController.deleteRoster);

// Talent Database
router.get('/skills', MinistryController.getSkills);
router.post('/skills', MinistryController.createSkill);
router.put('/skills/:id', MinistryController.updateSkill);
router.delete('/skills/:id', MinistryController.deleteSkill);
router.post('/skills/members/:memberId', MinistryController.assignSkill);
router.delete('/skills/members/:memberId/:skillId', MinistryController.removeSkill);
router.get('/talents/:skillId', MinistryController.searchTalents);

export default router;
