import { Request, Response } from 'express';
import { EventService } from '../../domain/event/event.service';
import { RegistrationStatus } from '@prisma/client';

const eventService = new EventService();

export const eventController = {
    async list(req: any, res: Response) {
        try {
            const includeClosed = req.query.includeClosed === 'true';
            const events = await eventService.getEvents(req.user.tenantId, includeClosed);
            res.json(events);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async create(req: any, res: Response) {
        try {
            const event = await eventService.createEvent(req.user.tenantId, req.body);
            res.status(201).json(event);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async update(req: any, res: Response) {
        try {
            const event = await eventService.updateEvent(req.user.tenantId, req.params.id, req.body);
            res.json(event);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async details(req: any, res: Response) {
        try {
            // Note: In real app, we should enforce tenantId check here
            const event = await eventService.getEventDetails(req.params.id);
            res.json(event);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async remove(req: any, res: Response) {
        try {
            await eventService.deleteEvent(req.user.tenantId, req.params.id);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async register(req: Request, res: Response) {
        try {
            // Public endpoint, use param id
            const reg = await eventService.registerForEvent(req.params.id as string, req.body);
            res.status(201).json(reg);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async publicInfo(req: Request, res: Response) {
        try {
            const event = await eventService.getPublicEventSummary(req.params.id as string);
            res.json(event);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async remindAll(req: any, res: Response) {
        try {
            const report = await eventService.sendBulkReminders(req.user.tenantId, req.params.id);
            res.json(report);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async checkin(req: any, res: Response) {
        try {
            const { eventId, id } = req.params;
            const { status } = req.body; // usually ATTENDED or CANCELLED or REGISTERED
            const reg = await eventService.checkInRegistration(req.user.tenantId, eventId, id, status as RegistrationStatus);
            res.json(reg);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
