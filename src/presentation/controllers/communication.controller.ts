import { Response } from 'express';
import { CommunicationService } from '../../domain/communication/communication.service';

const commService = new CommunicationService();

export const communicationController = {
    // Templates
    async listTemplates(req: any, res: Response) {
        try {
            const result = await commService.listTemplates(req.user.tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async createTemplate(req: any, res: Response) {
        try {
            const result = await commService.createTemplate(req.user.tenantId, req.body);
            res.status(201).json(result);
        } catch (error: any) {
            console.error('[CommunicationController] createTemplate error:', error);
            res.status(400).json({ error: error.message });
        }
    },

    async updateTemplate(req: any, res: Response) {
        try {
            const result = await commService.updateTemplate(req.user.tenantId, req.params.id, req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async deleteTemplate(req: any, res: Response) {
        try {
            await commService.deleteTemplate(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // Logs & Deliveries
    async listLogs(req: any, res: Response) {
        try {
            const result = await commService.listLogs(req.user.tenantId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async triggerEmail(req: any, res: Response) {
        try {
            const { recipient, subject, body } = req.body;
            if (!recipient || !subject || !body) throw new Error("Missing email payload details");

            const result = await commService.triggerMockEmail(req.user.tenantId, { recipient, subject, body });
            res.status(202).json({ message: "Email queued for delivery", logId: result.id });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async sendBulk(req: any, res: Response) {
        try {
            const result = await commService.sendBulkMessage(req.user.tenantId, req.body);
            res.status(202).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
