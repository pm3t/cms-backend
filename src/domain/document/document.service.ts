import { prisma } from '../../prisma';
import { z } from 'zod';
import { DocumentCategory, CertificateType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { NotificationService } from '../notification/notification.service';

const notificationService = new NotificationService();

// ===================================================
// Validation Schemas
// ===================================================

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title wajib diisi'),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(DocumentCategory).default('OTHER'),
  tags: z.string().optional().nullable(),
  speaker: z.string().optional().nullable(),
  // FormData sends dates as string — transform to ISO if provided
  date: z.string().optional().nullable().transform((v) => {
    if (!v || v === 'null' || v === 'undefined' || v.trim() === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }),
  // FormData sends booleans as strings 'true'/'false' — coerce to boolean
  isPublic: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).default(false),
});

export const createCertificateSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  type: z.nativeEnum(CertificateType),
  recipientName: z.string().min(1, 'Nama penerima wajib diisi'),
  recipientAddress: z.string().optional().nullable(),
  issuedDate: z.string().transform((v) => new Date(v).toISOString()),
  issuedBy: z.string().min(1, 'Nama pejabat yang menandatangani wajib diisi'),
  location: z.string().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  type: z.nativeEnum(CertificateType),
  content: z.string().min(1, 'Konten template wajib diisi'),
  isDefault: z.boolean().default(false),
});

// ===================================================
// Helper: Generate certificate number
// ===================================================

const CERT_TYPE_CODE: Record<CertificateType, string> = {
  BAPTISM: 'BAPT',
  MARRIAGE: 'NIKAH',
  CONFIRMATION: 'SIDI',
  MEMBERSHIP: 'PINDAH',
  OTHER: 'CERT',
};

async function generateCertificateNumber(tenantId: string, type: CertificateType): Promise<string> {
  const year = new Date().getFullYear();
  const typeCode = CERT_TYPE_CODE[type];

  // Count existing certs for this tenant+type+year
  const count = await prisma.certificate.count({
    where: {
      tenantId,
      type,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${typeCode}-${year}-${seq}`;
}

// ===================================================
// Helper: Delete physical file safely
// ===================================================

function deleteFileIfExists(fileUrl: string | null | undefined) {
  if (!fileUrl) return;
  // fileUrl is stored as e.g. /uploads/documents/...
  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const absolutePath = path.join(process.cwd(), relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

// ===================================================
// 1. DOCUMENT SERVICE — Digital Library
// ===================================================

export class DocumentService {
  async list(tenantId: string, filters?: { category?: DocumentCategory; search?: string }) {
    const where: any = { tenantId };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { speaker: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.document.findMany({
      where,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5, // latest 5 versions in list
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!doc || doc.tenantId !== tenantId) {
      throw new Error('Dokumen tidak ditemukan');
    }

    return doc;
  }

  async create(
    tenantId: string,
    userId: string,
    data: any,
    fileInfo?: { url: string; type: string; size: number; name: string }
  ) {
    const parsed = createDocumentSchema.parse(data);

    const docData: any = {
      ...parsed,
      date: parsed.date ? new Date(parsed.date) : null,
      // Normalize empty strings to null for optional fields
      description: parsed.description || null,
      tags: parsed.tags || null,
      speaker: parsed.speaker || null,
      tenantId,
      currentVersion: 1,
    };

    if (fileInfo) {
      docData.fileUrl = fileInfo.url;
      docData.fileType = fileInfo.type;
      docData.fileSize = fileInfo.size;
      docData.fileName = fileInfo.name;
    }

    const doc = await prisma.document.create({
      data: docData,
    });

    // Create initial version record if file was provided
    if (fileInfo) {
      await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          version: 1,
          fileUrl: fileInfo.url,
          fileType: fileInfo.type,
          fileSize: fileInfo.size,
          fileName: fileInfo.name,
          uploadedBy: userId,
          notes: 'Versi awal',
        },
      });
    }

    return this.get(tenantId, doc.id);
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id); // ownership check
    const parsed = createDocumentSchema.partial().parse(data);
    const updateData: any = { ...parsed };
    if (parsed.date) {
      updateData.date = new Date(parsed.date as string);
    }

    return prisma.document.update({
      where: { id },
      data: updateData,
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  async uploadNewVersion(
    tenantId: string,
    id: string,
    userId: string,
    fileInfo: { url: string; type: string; size: number; name: string },
    notes?: string
  ) {
    const doc = await this.get(tenantId, id); // ownership check
    const nextVersion = doc.currentVersion + 1;

    // Create new version record
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersion,
        fileUrl: fileInfo.url,
        fileType: fileInfo.type,
        fileSize: fileInfo.size,
        fileName: fileInfo.name,
        uploadedBy: userId,
        notes: notes || null,
      },
    });

    // Update document to point at new version
    return prisma.document.update({
      where: { id },
      data: {
        fileUrl: fileInfo.url,
        fileType: fileInfo.type,
        fileSize: fileInfo.size,
        fileName: fileInfo.name,
        currentVersion: nextVersion,
      },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  async delete(tenantId: string, id: string) {
    const doc = await this.get(tenantId, id);

    // Delete all version files
    for (const version of doc.versions) {
      deleteFileIfExists(version.fileUrl);
    }
    // Also delete the current file pointer (if differs)
    deleteFileIfExists(doc.fileUrl);

    return prisma.document.delete({ where: { id } });
  }
}

// ===================================================
// 2. CERTIFICATE SERVICE
// ===================================================

export class CertificateService {
  async list(tenantId: string, filters?: { type?: CertificateType; search?: string }) {
    const where: any = { tenantId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.search) {
      where.OR = [
        { recipientName: { contains: filters.search, mode: 'insensitive' } },
        { certificateNumber: { contains: filters.search, mode: 'insensitive' } },
        { issuedBy: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.certificate.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { select: { id: true, name: true, type: true } },
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        member: true,
        template: true,
      },
    });

    if (!cert || cert.tenantId !== tenantId) {
      throw new Error('Sertifikat tidak ditemukan');
    }

    return cert;
  }

  async listByMember(tenantId: string, memberId: string) {
    // Verify member belongs to tenant
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Anggota tidak ditemukan');
    }

    const fullName = `${member.firstName} ${member.lastName || ''}`.trim();

    return prisma.certificate.findMany({
      where: {
        tenantId,
        OR: [
          { memberId },
          {
            memberId: null,
            recipientName: {
              equals: fullName,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async create(tenantId: string, data: any) {
    const parsed = createCertificateSchema.parse(data);

    // Verify member if provided
    if (parsed.memberId) {
      const member = await prisma.member.findUnique({ where: { id: parsed.memberId } });
      if (!member || member.tenantId !== tenantId) {
        throw new Error('Anggota tidak ditemukan');
      }
    }

    // Verify template if provided
    if (parsed.templateId) {
      const template = await prisma.certificateTemplate.findUnique({ where: { id: parsed.templateId } });
      if (!template || template.tenantId !== tenantId) {
        throw new Error('Template tidak ditemukan');
      }
    }

    const certificateNumber = await generateCertificateNumber(tenantId, parsed.type);

    return prisma.certificate.create({
      data: {
        ...parsed,
        issuedDate: new Date(parsed.issuedDate),
        certificateNumber,
        tenantId,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const oldCert = await this.get(tenantId, id); // ownership check
    const parsed = createCertificateSchema.partial().parse(data);
    const updateData: any = { ...parsed };

    if (parsed.issuedDate) {
      updateData.issuedDate = new Date(parsed.issuedDate as string);
    }

    if (parsed.fileUrl && oldCert.fileUrl && oldCert.fileUrl !== parsed.fileUrl) {
      deleteFileIfExists(oldCert.fileUrl);
    }

    return prisma.certificate.update({
      where: { id },
      data: updateData,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true } },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const cert = await this.get(tenantId, id);
    deleteFileIfExists(cert.fileUrl);
    return prisma.certificate.delete({ where: { id } });
  }
}

// ===================================================
// 3. CERTIFICATE TEMPLATE SERVICE
// ===================================================

export class CertificateTemplateService {
  async list(tenantId: string) {
    return prisma.certificateTemplate.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async get(tenantId: string, id: string) {
    const tmpl = await prisma.certificateTemplate.findUnique({ where: { id } });
    if (!tmpl || tmpl.tenantId !== tenantId) {
      throw new Error('Template tidak ditemukan');
    }
    return tmpl;
  }

  async create(tenantId: string, data: any) {
    const parsed = createTemplateSchema.parse(data);

    // If set as default, demote other defaults for same type
    if (parsed.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: { tenantId, type: parsed.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.certificateTemplate.create({
      data: { ...parsed, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const tmpl = await this.get(tenantId, id);
    const parsed = createTemplateSchema.partial().parse(data);

    // If setting as default, demote other defaults for same type
    const targetType = parsed.type || tmpl.type;
    if (parsed.isDefault) {
      await prisma.certificateTemplate.updateMany({
        where: { tenantId, type: targetType, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return prisma.certificateTemplate.update({
      where: { id },
      data: parsed,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.certificateTemplate.delete({ where: { id } });
  }
}

// ===================================================
// 4. SACRAMENT REQUEST SERVICE
// ===================================================

export class SacramentRequestService {
  async list(tenantId: string, filters?: { status?: string; memberId?: string }) {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.memberId) {
      where.memberId = filters.memberId;
    }
    return prisma.sacramentRequest.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
        certificate: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async get(tenantId: string, id: string) {
    const request = await prisma.sacramentRequest.findUnique({
      where: { id },
      include: {
        member: true,
        certificate: true
      }
    });

    if (!request || request.tenantId !== tenantId) {
      throw new Error('Permohonan layanan sakramen tidak ditemukan');
    }

    return request;
  }

  async create(tenantId: string, memberId: string, data: any) {
    const { type, pastorName, date, location, requirements } = data;
    
    // verify member
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Anggota tidak ditemukan');
    }

    return prisma.sacramentRequest.create({
      data: {
        tenantId,
        memberId,
        type,
        status: 'PENDING',
        pastorName: pastorName || null,
        date: date ? new Date(date) : null,
        location: location || null,
        requirements: requirements || null
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } }
      }
    });
  }

  async approve(tenantId: string, id: string, approvalData: any) {
    const request = await this.get(tenantId, id);
    if (request.status !== 'PENDING') {
      throw new Error('Hanya permohonan berstatus PENDING yang dapat disetujui');
    }

    const certificateNumber = approvalData.certificateNumber || await generateCertificateNumber(tenantId, request.type);
    
    const cert = await prisma.certificate.create({
      data: {
        tenantId,
        memberId: request.memberId,
        type: request.type,
        certificateNumber,
        recipientName: `${request.member.firstName} ${request.member.lastName || ''}`.trim(),
        issuedDate: approvalData.issuedDate ? new Date(approvalData.issuedDate) : new Date(),
        issuedBy: approvalData.issuedBy || 'Gereja',
        location: approvalData.location || request.location,
        fileUrl: approvalData.fileUrl || null,
        notes: approvalData.notes || request.notes
      }
    });

    const updated = await prisma.sacramentRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        certificateId: cert.id,
        notes: approvalData.notes || request.notes
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        certificate: true
      }
    });

    try {
      await notificationService.create({
        tenantId,
        memberId: request.memberId,
        type: 'APPROVAL',
        title: '✅ Pengajuan Sakramen Disetujui',
        body: `Pengajuan sakramen ${request.type} Anda telah disetujui. Sertifikat digital sudah tersedia.`,
        data: { requestId: request.id, certificateId: cert.id },
      });
    } catch (err) {
      console.error('Failed to create sacrament approval notification:', err);
    }

    return updated;
  }

  async reject(tenantId: string, id: string, rejectNotes: string) {
    const request = await this.get(tenantId, id);
    if (request.status !== 'PENDING') {
      throw new Error('Hanya permohonan berstatus PENDING yang dapat ditolak');
    }

    const updated = await prisma.sacramentRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: rejectNotes || null
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    try {
      await notificationService.create({
        tenantId,
        memberId: request.memberId,
        type: 'REJECTION',
        title: '❌ Pengajuan Sakramen Ditolak',
        body: `Pengajuan sakramen ${request.type} Anda ditolak. Alasan: ${rejectNotes || '-'}`,
        data: { requestId: request.id },
      });
    } catch (err) {
      console.error('Failed to create sacrament rejection notification:', err);
    }

    return updated;
  }
}
