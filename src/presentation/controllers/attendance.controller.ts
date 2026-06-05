import { Request, Response } from 'express';
import { AttendanceService } from '../../domain/attendance/attendance.service';

const attendanceService = new AttendanceService();

export const attendanceController = {
    async createService(req: any, res: Response) {
        try {
            const service = await attendanceService.createService(req.user.tenantId, req.body);
            res.status(201).json(service);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getServices(req: any, res: Response) {
        try {
            const services = await attendanceService.listServices(req.user.tenantId);
            res.json(services);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async updateService(req: any, res: Response) {
        try {
            const service = await attendanceService.updateService(req.user.tenantId, req.params.id, req.body);
            res.json(service);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async deleteService(req: any, res: Response) {
        try {
            await attendanceService.deleteService(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async checkIn(req: any, res: Response) {
        try {
            const record = await attendanceService.recordAttendance(req.user.tenantId, req.body);
            res.status(201).json(record);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getHistory(req: any, res: Response) {
        try {
            const history = await attendanceService.getHistory(req.user.tenantId, req.query);
            res.json(history);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getStats(req: any, res: Response) {
        try {
            const stats = await attendanceService.getStats(req.user.tenantId);
            res.json(stats);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getAbsentees(req: any, res: Response) {
        try {
            const absentees = await attendanceService.getAbsentees(req.user.tenantId);
            res.json(absentees);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
