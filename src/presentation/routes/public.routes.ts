import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { digitalController } from '../controllers/digital.controller';
import { DigitalService } from '../../domain/digital/digital.service';

const digitalService = new DigitalService();

const publicRouter = Router();

// Public endpoints for Donation Portal
publicRouter.get('/church/:id', publicController.getChurchInfo);
publicRouter.get('/church/:id/website', publicController.getChurchWebsiteData);
publicRouter.post('/church/:tenantId/give', publicController.createDonation);

// --- Digital Engagement (Requires API Key) ---
const requireApiKey = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) return res.status(401).json({ error: 'API Key required' });
  
  try {
    const config = await digitalService.validateApiKey(apiKey);
    if (!config) return res.status(403).json({ error: 'Invalid API Key' });
    req.publicTenantId = config.tenantId; // inject tenantId derived from apiKey
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

publicRouter.get('/digital/sermons', requireApiKey, digitalController.getPublicSermons);
publicRouter.get('/digital/bulletins', requireApiKey, digitalController.getPublicBulletins);
publicRouter.get('/digital/config', requireApiKey, digitalController.getPublicConfig);

export default publicRouter;
