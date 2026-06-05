import { Router } from 'express';
import { xenditWebhookHandler } from '../controllers/xenditWebhook.controller';

const router = Router();

// No authentication required — Xendit hits this endpoint from their servers
// Security is handled by x-callback-token verification inside the handler
router.post('/xendit', xenditWebhookHandler);

export default router;
