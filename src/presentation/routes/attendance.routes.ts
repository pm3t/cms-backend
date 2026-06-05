import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { FeatureGate } from '../middlewares/featureGate.middleware';

const router = Router();

// All attendance routes require authentication
router.use(authenticateJWT);
router.use(FeatureGate('attendance_tracking'));

// Service Management
router.post('/services', attendanceController.createService);
router.get('/services', attendanceController.getServices);
router.patch('/services/:id', attendanceController.updateService);
router.delete('/services/:id', attendanceController.deleteService);

// Check-in & History
router.post('/check-in', attendanceController.checkIn);
router.get('/history', attendanceController.getHistory);

// Analytics & Alerts
router.get('/stats', attendanceController.getStats);
router.get('/alerts/absentees', attendanceController.getAbsentees);

export default router;
