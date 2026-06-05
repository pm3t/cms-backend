import { Response } from 'express';
import { AnnouncementService } from '../../domain/communication/announcement.service';

const announcementService = new AnnouncementService();

export const announcementController = {
    async list(req: any, res: Response) {
        try {
            const result = await announcementService.listAnnouncements(req.user.tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async get(req: any, res: Response) {
        try {
            const result = await announcementService.getAnnouncement(req.user.tenantId, req.params.id);
            res.json(result);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async create(req: any, res: Response) {
        try {
            const result = await announcementService.createAnnouncement(req.user.tenantId, req.user.userId, req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async update(req: any, res: Response) {
        try {
            const result = await announcementService.updateAnnouncement(req.user.tenantId, req.params.id, req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async delete(req: any, res: Response) {
        try {
            await announcementService.deleteAnnouncement(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
