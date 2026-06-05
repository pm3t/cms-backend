import { Router } from 'express';
import { facilityController } from '../controllers/facility.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const facilityRouter = Router();

facilityRouter.use(authenticateJWT);
facilityRouter.use(SubscriptionGate);
facilityRouter.use(FeatureGate('facility_management'));

// ─── Facilities (Ruangan) ─────────────────────────────────────────────────────
facilityRouter.get('/rooms', facilityController.getFacilities);
facilityRouter.post('/rooms', facilityController.createFacility);
facilityRouter.get('/rooms/:id', facilityController.getFacilityById);
facilityRouter.patch('/rooms/:id', facilityController.updateFacility);
facilityRouter.delete('/rooms/:id', facilityController.deleteFacility);
facilityRouter.get('/rooms/:id/availability', facilityController.checkAvailability);

// ─── Bookings (Reservasi) ─────────────────────────────────────────────────────
facilityRouter.get('/bookings', facilityController.getBookings);
facilityRouter.post('/bookings', facilityController.createBooking);
facilityRouter.get('/bookings/:id', facilityController.getBookingById);
facilityRouter.patch('/bookings/:id/status', facilityController.updateBookingStatus);
facilityRouter.delete('/bookings/:id', facilityController.deleteBooking);

// ─── Equipment (Inventaris) ───────────────────────────────────────────────────
facilityRouter.get('/equipment', facilityController.getEquipments);
facilityRouter.post('/equipment', facilityController.createEquipment);
facilityRouter.get('/equipment/:id', facilityController.getEquipmentById);
facilityRouter.patch('/equipment/:id', facilityController.updateEquipment);
facilityRouter.delete('/equipment/:id', facilityController.deleteEquipment);
facilityRouter.post('/equipment/:id/log', facilityController.addEquipmentLog);

// ─── Maintenance ──────────────────────────────────────────────────────────────
// NOTE: /maintenance/overdue must be before /maintenance/:id
facilityRouter.get('/maintenance/overdue', facilityController.getOverdueMaintenance);
facilityRouter.get('/maintenance', facilityController.getMaintenances);
facilityRouter.post('/maintenance', facilityController.createMaintenance);
facilityRouter.get('/maintenance/:id', facilityController.getMaintenanceById);
facilityRouter.patch('/maintenance/:id', facilityController.updateMaintenance);
facilityRouter.delete('/maintenance/:id', facilityController.deleteMaintenance);

// ─── Utilities ────────────────────────────────────────────────────────────────
// NOTE: /utilities/summary/:year must be before /utilities/:id
facilityRouter.get('/utilities/summary/:year', facilityController.getUtilitySummary);
facilityRouter.get('/utilities', facilityController.getUtilities);
facilityRouter.post('/utilities', facilityController.createUtility);
facilityRouter.get('/utilities/:id', facilityController.getUtilityById);
facilityRouter.patch('/utilities/:id', facilityController.updateUtility);
facilityRouter.delete('/utilities/:id', facilityController.deleteUtility);

export default facilityRouter;
