import { Response, NextFunction } from 'express';
import path from 'path';
import {
  DocumentService,
  CertificateService,
  CertificateTemplateService,
} from '../../domain/document/document.service';
import { DocumentCategory, CertificateType } from '@prisma/client';

const documentService = new DocumentService();
const certificateService = new CertificateService();
const templateService = new CertificateTemplateService();

// Helper: build file info from multer uploaded file
function buildFileInfo(file: Express.Multer.File, tenantId: string) {
  // Construct a URL path relative to server root
  const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
  return {
    url: `/${relativePath}`,
    type: file.mimetype,
    size: file.size,
    name: file.originalname,
  };
}

export const documentController = {
  // ─── LIBRARY ────────────────────────────────────────────────────────────────

  async getDocuments(req: any, res: Response, _next: NextFunction) {
    try {
      const { category, search } = req.query;
      const filters: any = {};
      if (category && Object.values(DocumentCategory).includes(category as DocumentCategory)) {
        filters.category = category as DocumentCategory;
      }
      if (search) filters.search = String(search);

      const records = await documentService.list(req.user.tenantId, filters);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getDocumentById(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await documentService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async createDocument(req: any, res: Response, _next: NextFunction) {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const fileInfo = file ? buildFileInfo(file, req.user.tenantId) : undefined;

      const record = await documentService.create(
        req.user.tenantId,
        req.user.userId,
        req.body,
        fileInfo
      );
      res.status(201).json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async updateDocument(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await documentService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async uploadVersion(req: any, res: Response, _next: NextFunction) {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'File wajib disertakan untuk upload versi baru.' });
      }

      const fileInfo = buildFileInfo(file, req.user.tenantId);
      const { notes } = req.body;

      const record = await documentService.uploadNewVersion(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        fileInfo,
        notes
      );
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async deleteDocument(req: any, res: Response, _next: NextFunction) {
    try {
      await documentService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // ─── CERTIFICATES ────────────────────────────────────────────────────────────

  async getCertificates(req: any, res: Response, _next: NextFunction) {
    try {
      const { type, search } = req.query;
      const filters: any = {};
      if (type && Object.values(CertificateType).includes(type as CertificateType)) {
        filters.type = type as CertificateType;
      }
      if (search) filters.search = String(search);

      const records = await certificateService.list(req.user.tenantId, filters);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getCertificateById(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await certificateService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async getMemberCertificates(req: any, res: Response, _next: NextFunction) {
    try {
      const records = await certificateService.listByMember(
        req.user.tenantId,
        req.params.memberId
      );
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async createCertificate(req: any, res: Response, _next: NextFunction) {
    try {
      const data = { ...req.body };
      for (const key of Object.keys(data)) {
        if (data[key] === 'null' || data[key] === 'undefined' || data[key] === '') {
          data[key] = null;
        }
      }

      const file = req.file as Express.Multer.File | undefined;
      if (file) {
        const fileInfo = buildFileInfo(file, req.user.tenantId);
        data.fileUrl = fileInfo.url;
      }

      const record = await certificateService.create(req.user.tenantId, data);
      res.status(201).json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async updateCertificate(req: any, res: Response, _next: NextFunction) {
    try {
      const data = { ...req.body };
      for (const key of Object.keys(data)) {
        if (data[key] === 'null' || data[key] === 'undefined' || data[key] === '') {
          data[key] = null;
        }
      }

      const file = req.file as Express.Multer.File | undefined;
      if (file) {
        const fileInfo = buildFileInfo(file, req.user.tenantId);
        data.fileUrl = fileInfo.url;
      }

      const record = await certificateService.update(req.user.tenantId, req.params.id, data);
      res.json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async deleteCertificate(req: any, res: Response, _next: NextFunction) {
    try {
      await certificateService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // ─── TEMPLATES ───────────────────────────────────────────────────────────────

  async getTemplates(req: any, res: Response, _next: NextFunction) {
    try {
      const records = await templateService.list(req.user.tenantId);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getTemplateById(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await templateService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async createTemplate(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await templateService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async updateTemplate(req: any, res: Response, _next: NextFunction) {
    try {
      const record = await templateService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (err: any) {
      if (err.errors) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  async deleteTemplate(req: any, res: Response, _next: NextFunction) {
    try {
      await templateService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
