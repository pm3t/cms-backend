import { Response, NextFunction } from 'express';
import { BookingStatus, EquipmentCondition, UtilityType, MaintenanceStatus } from '@prisma/client';
import {
  FacilityService,
  FacilityBookingService,
  EquipmentService,
  MaintenanceService,
  UtilityService,
} from '../../domain/facility/facility.service';

const facilityService = new FacilityService();
const bookingService = new FacilityBookingService();
const equipmentService = new EquipmentService();
const maintenanceService = new MaintenanceService();
const utilityService = new UtilityService();

export const facilityController = {
  // ─── Facilities ─────────────────────────────────────────────────────────────
  async getFacilities(req: any, res: Response) {
    try { res.json(await facilityService.list(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getFacilityById(req: any, res: Response) {
    try { res.json(await facilityService.get(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(404).json({ error: e.message }); }
  },
  async createFacility(req: any, res: Response) {
    try { res.status(201).json(await facilityService.create(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async updateFacility(req: any, res: Response) {
    try { res.json(await facilityService.update(req.user.tenantId, req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async deleteFacility(req: any, res: Response) {
    try { res.json(await facilityService.delete(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async checkAvailability(req: any, res: Response) {
    try {
      const { startTime, endTime } = req.query;
      if (!startTime || !endTime) return res.status(400).json({ error: 'startTime and endTime required' });
      const result = await facilityService.checkAvailability(
        req.user.tenantId, req.params.id,
        new Date(String(startTime)), new Date(String(endTime))
      );
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // ─── Bookings ────────────────────────────────────────────────────────────────
  async getBookings(req: any, res: Response) {
    try {
      const { facilityId, status, date } = req.query;
      const filters: any = {};
      if (facilityId) filters.facilityId = String(facilityId);
      if (status && Object.values(BookingStatus).includes(status as BookingStatus)) filters.status = status;
      if (date) filters.date = String(date);
      res.json(await bookingService.list(req.user.tenantId, filters));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getBookingById(req: any, res: Response) {
    try { res.json(await bookingService.get(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(404).json({ error: e.message }); }
  },
  async createBooking(req: any, res: Response) {
    try { res.status(201).json(await bookingService.create(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async updateBookingStatus(req: any, res: Response) {
    try {
      const { status, approvedBy } = req.body;
      if (!Object.values(BookingStatus).includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
      res.json(await bookingService.updateStatus(req.user.tenantId, req.params.id, status, approvedBy));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async deleteBooking(req: any, res: Response) {
    try { await bookingService.delete(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // ─── Equipment ───────────────────────────────────────────────────────────────
  async getEquipments(req: any, res: Response) {
    try {
      const { condition, category, search } = req.query;
      const filters: any = {};
      if (condition && Object.values(EquipmentCondition).includes(condition as EquipmentCondition)) filters.condition = condition;
      if (category) filters.category = String(category);
      if (search) filters.search = String(search);
      res.json(await equipmentService.list(req.user.tenantId, filters));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getEquipmentById(req: any, res: Response) {
    try { res.json(await equipmentService.get(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(404).json({ error: e.message }); }
  },
  async createEquipment(req: any, res: Response) {
    try { res.status(201).json(await equipmentService.create(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async updateEquipment(req: any, res: Response) {
    try { res.json(await equipmentService.update(req.user.tenantId, req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async deleteEquipment(req: any, res: Response) {
    try { res.json(await equipmentService.delete(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async addEquipmentLog(req: any, res: Response) {
    try { res.status(201).json(await equipmentService.addLog(req.user.tenantId, req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },

  // ─── Maintenance ─────────────────────────────────────────────────────────────
  async getMaintenances(req: any, res: Response) {
    try {
      const { status, type, facilityId } = req.query;
      const filters: any = {};
      if (status && Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)) filters.status = status;
      if (type) filters.type = String(type);
      if (facilityId) filters.facilityId = String(facilityId);
      // Auto-mark overdue before listing
      await maintenanceService.markOverdue(req.user.tenantId);
      res.json(await maintenanceService.list(req.user.tenantId, filters));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getOverdueMaintenance(req: any, res: Response) {
    try { res.json(await maintenanceService.getOverdue(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getMaintenanceById(req: any, res: Response) {
    try { res.json(await maintenanceService.get(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(404).json({ error: e.message }); }
  },
  async createMaintenance(req: any, res: Response) {
    try { res.status(201).json(await maintenanceService.create(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async updateMaintenance(req: any, res: Response) {
    try { res.json(await maintenanceService.update(req.user.tenantId, req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async deleteMaintenance(req: any, res: Response) {
    try { await maintenanceService.delete(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // ─── Utilities ───────────────────────────────────────────────────────────────
  async getUtilities(req: any, res: Response) {
    try {
      const { type, year } = req.query;
      const filters: any = {};
      if (type && Object.values(UtilityType).includes(type as UtilityType)) filters.type = type;
      if (year) filters.year = Number(year);
      res.json(await utilityService.list(req.user.tenantId, filters));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getUtilitySummary(req: any, res: Response) {
    try { res.json(await utilityService.getSummaryByYear(req.user.tenantId, Number(req.params.year))); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getUtilityById(req: any, res: Response) {
    try { res.json(await utilityService.get(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(404).json({ error: e.message }); }
  },
  async createUtility(req: any, res: Response) {
    try { res.status(201).json(await utilityService.create(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async updateUtility(req: any, res: Response) {
    try { res.json(await utilityService.update(req.user.tenantId, req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },
  async deleteUtility(req: any, res: Response) {
    try { await utilityService.delete(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
};
