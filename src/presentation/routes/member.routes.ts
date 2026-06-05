import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { photoUpload } from '../middlewares/upload.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const memberRouter = Router();

// Strictly enforce tenant mapping logic via JWT across all directories
memberRouter.use(authenticateJWT);
memberRouter.use(SubscriptionGate);
memberRouter.use(FeatureGate('member_directory'));

memberRouter.get('/', memberController.getMembers);
memberRouter.post('/', memberController.createMember);
memberRouter.post('/import', memberController.importCsv);
memberRouter.delete('/bulk', memberController.bulkDeleteMembers);
memberRouter.get('/:id', memberController.getMemberById);
memberRouter.patch('/:id', memberController.updateMember);
memberRouter.delete('/:id', memberController.deleteMember);
memberRouter.post('/:id/photo', photoUpload.single('photo'), memberController.uploadPhoto);
memberRouter.post('/:id/reset-password', memberController.resetMobilePassword);

memberRouter.get('/families/all', memberController.getFamilies);
memberRouter.post('/families/create', memberController.createFamily);
memberRouter.patch('/families/:id', memberController.updateFamily);

memberRouter.post('/:memberId/sacraments', memberController.addSacrament);
memberRouter.delete('/sacraments/:id', memberController.deleteSacrament);

export default memberRouter;

