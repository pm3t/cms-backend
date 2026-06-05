import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';
import { documentUpload } from '../middlewares/upload.middleware';

const documentRouter = Router();

// Enforce JWT Authentication and Subscription Gate across all endpoints
documentRouter.use(authenticateJWT);
documentRouter.use(SubscriptionGate);
documentRouter.use(FeatureGate('document_library'));

// ─── Digital Library ─────────────────────────────────────────────────────────
// GET  /api/documents/library           — list all docs (with ?category=&search=)
// POST /api/documents/library           — create document (multipart/form-data)
// GET  /api/documents/library/:id       — get single doc with all versions
// PATCH /api/documents/library/:id      — update metadata (JSON)
// POST /api/documents/library/:id/version — upload new version (multipart)
// DELETE /api/documents/library/:id     — delete document + all files

documentRouter.get('/library', documentController.getDocuments);
documentRouter.post('/library', documentUpload.single('file'), documentController.createDocument);
documentRouter.get('/library/:id', documentController.getDocumentById);
documentRouter.patch('/library/:id', documentController.updateDocument);
documentRouter.post('/library/:id/version', documentUpload.single('file'), documentController.uploadVersion);
documentRouter.delete('/library/:id', documentController.deleteDocument);

// ─── Certificates ────────────────────────────────────────────────────────────
// NOTE: member-specific route must be before /:id to avoid routing conflicts
documentRouter.get('/certificates/member/:memberId', documentController.getMemberCertificates);
documentRouter.get('/certificates', documentController.getCertificates);
documentRouter.post('/certificates', documentUpload.single('file'), documentController.createCertificate);
documentRouter.get('/certificates/:id', documentController.getCertificateById);
documentRouter.patch('/certificates/:id', documentUpload.single('file'), documentController.updateCertificate);
documentRouter.delete('/certificates/:id', documentController.deleteCertificate);

// ─── Certificate Templates ───────────────────────────────────────────────────
documentRouter.get('/templates', documentController.getTemplates);
documentRouter.post('/templates', documentController.createTemplate);
documentRouter.get('/templates/:id', documentController.getTemplateById);
documentRouter.patch('/templates/:id', documentController.updateTemplate);
documentRouter.delete('/templates/:id', documentController.deleteTemplate);

export default documentRouter;
