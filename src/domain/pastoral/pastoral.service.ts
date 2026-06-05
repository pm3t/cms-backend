import { prisma } from '../../prisma';
import { z } from 'zod';

// Zod validation schemas
export const visitationSchema = z.object({
  memberId: z.string().uuid(),
  visitorName: z.string().min(1),
  visitDate: z.string().datetime().or(z.string().transform((val) => new Date(val).toISOString())),
  type: z.enum(['HOME', 'HOSPITAL', 'OTHER']),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']),
  purpose: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const counselingSchema = z.object({
  memberId: z.string().uuid(),
  counselorId: z.string().uuid().optional().nullable(),
  counselorName: z.string().min(1),
  counselingDate: z.string().datetime().or(z.string().transform((val) => new Date(val).toISOString())),
  title: z.string().min(1),
  issueDescription: z.string().min(1),
  actionPlan: z.string().optional().nullable(),
  notes: z.string().min(1),
  isPrivate: z.boolean().default(true),
});

export const prayerRequestSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  requesterName: z.string().min(1),
  requesterEmail: z.union([z.literal(''), z.string().email()]).optional().nullable(),
  requesterPhone: z.string().optional().nullable(),
  content: z.string().min(1),
  isAnonymous: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  status: z.enum(['PENDING', 'ACTIVE', 'ANSWERED']).default('PENDING'),
  notes: z.string().optional().nullable(),
});

export const careGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  leaderName: z.string().optional().nullable(),
});

export const crisisRecordSchema = z.object({
  memberId: z.string().uuid(),
  crisisType: z.enum(['BEREAVEMENT', 'SICKNESS', 'FINANCIAL', 'FAMILY', 'ACCIDENT', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).default('OPEN'),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const emergencyContactSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  email: z.union([z.literal(''), z.string().email()]).optional().nullable(),
  isPrimary: z.boolean().default(false),
});

// Helper: Check if user is Pastor, Admin, or SuperAdmin
async function hasPastoralAdminAccess(userId: string, userRoleId?: string, isSuperAdmin = false): Promise<boolean> {
  if (isSuperAdmin) return true;
  if (!userRoleId) return false;
  const role = await prisma.role.findUnique({ where: { id: userRoleId } });
  return role?.name === 'Pastor' || role?.name === 'Admin';
}

// 1. VISITATION SERVICE
export class PastoralVisitationService {
  async list(tenantId: string) {
    return prisma.pastoralVisitation.findMany({
      where: { tenantId },
      include: { member: true },
      orderBy: { visitDate: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const record = await prisma.pastoralVisitation.findUnique({
      where: { id },
      include: { member: true },
    });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Visitation record not found');
    }
    return record;
  }

  async create(tenantId: string, data: any) {
    const parsed = visitationSchema.parse(data);
    return prisma.pastoralVisitation.create({
      data: {
        ...parsed,
        visitDate: new Date(parsed.visitDate),
        tenantId,
      },
      include: { member: true },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = visitationSchema.partial().parse(data);
    
    const updateData: any = { ...parsed };
    if (parsed.visitDate) {
      updateData.visitDate = new Date(parsed.visitDate);
    }

    return prisma.pastoralVisitation.update({
      where: { id },
      data: updateData,
      include: { member: true },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.pastoralVisitation.delete({
      where: { id },
    });
  }
}

// 2. COUNSELING SERVICE (Confidential)
export class CounselingRecordService {
  async list(tenantId: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    const isAdmin = await hasPastoralAdminAccess(userId, userRoleId, isSuperAdmin);
    
    const whereClause: any = { tenantId };
    if (!isAdmin) {
      // Non-admins can only see public ones or ones they logged
      whereClause.OR = [
        { counselorId: userId },
        { isPrivate: false },
      ];
    }

    return prisma.counselingRecord.findMany({
      where: whereClause,
      include: { member: true },
      orderBy: { counselingDate: 'desc' },
    });
  }

  async get(tenantId: string, id: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    const record = await prisma.counselingRecord.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!record || record.tenantId !== tenantId) {
      throw new Error('Counseling record not found');
    }

    const isAdmin = await hasPastoralAdminAccess(userId, userRoleId, isSuperAdmin);
    if (record.isPrivate && !isAdmin && record.counselorId !== userId) {
      throw new Error('Access denied: This counseling session is confidential');
    }

    return record;
  }

  async create(tenantId: string, userId: string, data: any) {
    const parsed = counselingSchema.parse(data);
    return prisma.counselingRecord.create({
      data: {
        ...parsed,
        counselingDate: new Date(parsed.counselingDate),
        counselorId: parsed.counselorId || userId,
        tenantId,
      },
      include: { member: true },
    });
  }

  async update(tenantId: string, id: string, userId: string, userRoleId: string | undefined, isSuperAdmin: boolean | undefined, data: any) {
    // Perform permission verification first
    await this.get(tenantId, id, userId, userRoleId, isSuperAdmin);
    
    const parsed = counselingSchema.partial().parse(data);
    const updateData: any = { ...parsed };
    if (parsed.counselingDate) {
      updateData.counselingDate = new Date(parsed.counselingDate);
    }

    return prisma.counselingRecord.update({
      where: { id },
      data: updateData,
      include: { member: true },
    });
  }

  async delete(tenantId: string, id: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    // Perform permission verification first
    await this.get(tenantId, id, userId, userRoleId, isSuperAdmin);
    return prisma.counselingRecord.delete({
      where: { id },
    });
  }
}

// 3. PRAYER REQUEST SERVICE
export class PrayerRequestService {
  async list(tenantId: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    const isAdmin = await hasPastoralAdminAccess(userId, userRoleId, isSuperAdmin);
    const whereClause: any = { tenantId };
    
    if (!isAdmin) {
      whereClause.isPrivate = false;
    }

    return prisma.prayerRequest.findMany({
      where: whereClause,
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(tenantId: string, id: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    const record = await prisma.prayerRequest.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!record || record.tenantId !== tenantId) {
      throw new Error('Prayer request not found');
    }

    const isAdmin = await hasPastoralAdminAccess(userId, userRoleId, isSuperAdmin);
    if (record.isPrivate && !isAdmin) {
      throw new Error('Access denied: This prayer request is private');
    }

    return record;
  }

  async create(tenantId: string, data: any) {
    const parsed = prayerRequestSchema.parse(data);
    return prisma.prayerRequest.create({
      data: {
        ...parsed,
        tenantId,
      },
      include: { member: true },
    });
  }

  async update(tenantId: string, id: string, userId: string, userRoleId: string | undefined, isSuperAdmin: boolean | undefined, data: any) {
    await this.get(tenantId, id, userId, userRoleId, isSuperAdmin);
    const parsed = prayerRequestSchema.partial().parse(data);
    return prisma.prayerRequest.update({
      where: { id },
      data: parsed,
      include: { member: true },
    });
  }

  async incrementPray(tenantId: string, id: string) {
    // Ensure it belongs to the tenant
    const record = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Prayer request not found');
    }

    return prisma.prayerRequest.update({
      where: { id },
      data: {
        prayerCount: { increment: 1 },
      },
    });
  }

  async delete(tenantId: string, id: string, userId: string, userRoleId?: string, isSuperAdmin = false) {
    await this.get(tenantId, id, userId, userRoleId, isSuperAdmin);
    return prisma.prayerRequest.delete({
      where: { id },
    });
  }
}

// 4. CARE GROUP SERVICE
export class CareGroupService {
  async list(tenantId: string) {
    return prisma.careGroup.findMany({
      where: { tenantId },
      include: {
        members: {
          include: { member: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const record = await prisma.careGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { member: true },
        },
      },
    });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Care group not found');
    }
    return record;
  }

  async create(tenantId: string, data: any) {
    const parsed = careGroupSchema.parse(data);
    return prisma.careGroup.create({
      data: {
        ...parsed,
        tenantId,
      },
      include: {
        members: {
          include: { member: true },
        },
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = careGroupSchema.partial().parse(data);
    return prisma.careGroup.update({
      where: { id },
      data: parsed,
      include: {
        members: {
          include: { member: true },
        },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.careGroup.delete({
      where: { id },
    });
  }

  async addMember(tenantId: string, groupId: string, memberId: string) {
    // Verify group and member belong to tenant
    await this.get(tenantId, groupId);
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Member not found');
    }

    return prisma.careGroupMember.create({
      data: {
        groupId,
        memberId,
      },
      include: {
        member: true,
      },
    });
  }

  async removeMember(tenantId: string, groupId: string, memberId: string) {
    await this.get(tenantId, groupId);
    const relation = await prisma.careGroupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId,
          memberId,
        },
      },
    });
    if (!relation) {
      throw new Error('Member is not part of this care group');
    }

    return prisma.careGroupMember.delete({
      where: {
        groupId_memberId: {
          groupId,
          memberId,
        },
      },
    });
  }
}

// 5. CRISIS & EMERGENCY SERVICE
export class CrisisRecordService {
  async list(tenantId: string) {
    return prisma.crisisRecord.findMany({
      where: { tenantId },
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const record = await prisma.crisisRecord.findUnique({
      where: { id },
      include: { member: true },
    });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Crisis record not found');
    }
    return record;
  }

  async create(tenantId: string, data: any) {
    const parsed = crisisRecordSchema.parse(data);
    return prisma.crisisRecord.create({
      data: {
        ...parsed,
        tenantId,
      },
      include: { member: true },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = crisisRecordSchema.partial().parse(data);
    return prisma.crisisRecord.update({
      where: { id },
      data: parsed,
      include: { member: true },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.crisisRecord.delete({
      where: { id },
    });
  }
}

export class EmergencyContactService {
  async listByMember(tenantId: string, memberId: string) {
    // Verify member belongs to tenant
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Member not found');
    }

    return prisma.emergencyContact.findMany({
      where: { memberId, tenantId },
      orderBy: { isPrimary: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const record = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Emergency contact not found');
    }
    return record;
  }

  async create(tenantId: string, data: any) {
    const parsed = emergencyContactSchema.parse(data);
    
    // Validate member
    const member = await prisma.member.findUnique({ where: { id: parsed.memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Member not found');
    }

    // If setting as primary, demote other contacts for this member
    if (parsed.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { memberId: parsed.memberId, tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.emergencyContact.create({
      data: {
        ...parsed,
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const record = await this.get(tenantId, id);
    const parsed = emergencyContactSchema.partial().parse(data);

    if (parsed.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { memberId: record.memberId, tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.emergencyContact.update({
      where: { id },
      data: parsed,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.emergencyContact.delete({
      where: { id },
    });
  }
}
