import { Request, Response } from 'express';
import { NewsletterService } from '../../domain/communication/newsletter.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const newsletterService = new NewsletterService();

export const newsletterController = {
  async list(req: AuthRequest, res: Response) {
    try {
      const data = await newsletterService.list(req.user!.tenantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async get(req: AuthRequest, res: Response) {
    try {
      const data = await newsletterService.get(req.user!.tenantId, req.params.id as string);
      if (!data) return res.status(404).json({ error: 'Newsletter not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const data = await newsletterService.create(req.user!.tenantId, req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      await newsletterService.update(req.user!.tenantId, req.params.id as string, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await newsletterService.delete(req.user!.tenantId, req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
