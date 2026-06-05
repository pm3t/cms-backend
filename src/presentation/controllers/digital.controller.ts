import { Response } from 'express';
import { DigitalService } from '../../domain/digital/digital.service';

const digitalService = new DigitalService();

export const digitalController = {
  // Admin Routes
  async getSermons(req: any, res: Response) {
    try { res.json(await digitalService.getSermons(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async createSermon(req: any, res: Response) {
    try { res.status(201).json(await digitalService.createSermon(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async deleteSermon(req: any, res: Response) {
    try { await digitalService.deleteSermon(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getBulletins(req: any, res: Response) {
    try { res.json(await digitalService.getBulletins(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async createBulletin(req: any, res: Response) {
    try { res.status(201).json(await digitalService.createBulletin(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async deleteBulletin(req: any, res: Response) {
    try { await digitalService.deleteBulletin(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getConfig(req: any, res: Response) {
    try { res.json(await digitalService.getConfig(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async updateConfig(req: any, res: Response) {
    try { res.json(await digitalService.updateConfig(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async generateApiKey(req: any, res: Response) {
    try { res.json(await digitalService.generateApiKey(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // Public/Mobile API Routes
  async getPublicSermons(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.publicTenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });
      res.json(await digitalService.getPublicSermons(tenantId));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getPublicBulletins(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.publicTenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });
      res.json(await digitalService.getPublicBulletins(tenantId));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getPublicConfig(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.publicTenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });
      const config = await digitalService.getConfig(tenantId);
      // Only return public fields
      res.json({ liveStreamUrl: config?.liveStreamUrl });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }
};
