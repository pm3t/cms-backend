import { Router } from 'express';
import { smallGroupController } from '../controllers/smallGroup.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { FeatureGate } from '../middlewares/featureGate.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateJWT);
router.use(FeatureGate('small_groups'));

// --- GROUPS ---
router.get('/', smallGroupController.getGroups);
router.post('/', smallGroupController.createGroup);
router.get('/:id', smallGroupController.getGroupById);
router.put('/:id', smallGroupController.updateGroup);
router.delete('/:id', smallGroupController.deleteGroup);

// --- MEMBERSHIP ---
router.post('/:id/members', smallGroupController.addMember);
router.delete('/:id/members/:memberId', smallGroupController.removeMember);
router.put('/:id/members/:memberId/role', smallGroupController.updateMemberRole);

// --- MEETINGS & ATTENDANCE ---
router.get('/:id/meetings', smallGroupController.getMeetings);
router.post('/:id/meetings', smallGroupController.createMeeting);
router.get('/meetings/:meetingId', smallGroupController.getMeetingById);
router.post('/meetings/:meetingId/attendance', smallGroupController.recordAttendance);

export { router as smallGroupRoutes };
