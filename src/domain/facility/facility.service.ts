import { prisma } from '../../prisma';
import { z } from 'zod';
import {
  FacilityType,
  BookingStatus,
  EquipmentCondition,
  EquipmentLogAction,
  MaintenanceFrequency,
  MaintenanceStatus,
  UtilityType,
} from '@prisma/client';

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const facilitySchema = z.object({
  name: z.string().min(1, 'Nama fasilitas wajib diisi'),
  type: z.nativeEnum(FacilityType).default('OTHER'),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  amenities: z.string().optional().nullable(),
  isActive: z.union([z.boolean(), z.string().transform(v => v === 'true')]).default(true),
});

export const bookingSchema = z.object({
  facilityId: z.string().uuid('ID fasilitas tidak valid'),
  requestedBy: z.string().min(1, 'Nama pemohon wajib diisi'),
  purpose: z.string().min(1, 'Tujuan penggunaan wajib diisi'),
  description: z.string().optional().nullable(),
  startTime: z.string().transform(v => new Date(v)),
  endTime: z.string().transform(v => new Date(v)),
  notes: z.string().optional().nullable(),
}).refine(d => d.endTime > d.startTime, {
  message: 'Waktu selesai harus setelah waktu mulai',
  path: ['endTime'],
});

export const equipmentSchema = z.object({
  name: z.string().min(1, 'Nama peralatan wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  serialNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().transform(v => v && v.trim() ? new Date(v) : null),
  purchasePrice: z.coerce.number().optional().nullable(),
  condition: z.nativeEnum(EquipmentCondition).default('GOOD'),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  nextMaintenanceDate: z.string().optional().nullable().transform(v => v && v.trim() ? new Date(v) : null),
  isActive: z.union([z.boolean(), z.string().transform(v => v === 'true')]).default(true),
});

export const equipmentLogSchema = z.object({
  action: z.nativeEnum(EquipmentLogAction),
  performedBy: z.string().min(1, 'Nama pelaksana wajib diisi'),
  notes: z.string().optional().nullable(),
  date: z.string().optional().transform(v => v ? new Date(v) : new Date()),
});

export const maintenanceSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional().nullable(),
  type: z.string().min(1, 'Tipe maintenance wajib diisi'),
  frequency: z.nativeEnum(MaintenanceFrequency).default('ONE_TIME'),
  status: z.nativeEnum(MaintenanceStatus).default('PENDING'),
  facilityId: z.string().uuid().optional().nullable(),
  equipmentId: z.string().uuid().optional().nullable(),
  scheduledDate: z.string().transform(v => new Date(v)),
  completedDate: z.string().optional().nullable().transform(v => v && v.trim() ? new Date(v) : null),
  assignedTo: z.string().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const utilitySchema = z.object({
  type: z.nativeEnum(UtilityType),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  amount: z.coerce.number().positive('Jumlah tagihan wajib diisi'),
  usage: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  isPaid: z.union([z.boolean(), z.string().transform(v => v === 'true')]).default(false),
  notes: z.string().optional().nullable(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function assertOwnership(record: { tenantId: string } | null, tenantId: string, label: string) {
  if (!record || record.tenantId !== tenantId) throw new Error(`${label} tidak ditemukan`);
}

// ─── 1. Facility Service ──────────────────────────────────────────────────────

export class FacilityService {
  async list(tenantId: string) {
    return prisma.facility.findMany({
      where: { tenantId },
      include: {
        _count: { select: { bookings: true, maintenances: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const rec = await prisma.facility.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          orderBy: { startTime: 'asc' },
          take: 10,
        },
        maintenances: { orderBy: { scheduledDate: 'asc' }, take: 5 },
      },
    });
    assertOwnership(rec, tenantId, 'Fasilitas');
    return rec;
  }

  async create(tenantId: string, data: any) {
    const parsed = facilitySchema.parse(data);
    return prisma.facility.create({ data: { ...parsed, tenantId } });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = facilitySchema.partial().parse(data);
    return prisma.facility.update({ where: { id }, data: parsed });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.facility.update({ where: { id }, data: { isActive: false } });
  }

  async checkAvailability(tenantId: string, facilityId: string, startTime: Date, endTime: Date, excludeBookingId?: string) {
    const conflict = await prisma.facilityBooking.findFirst({
      where: {
        tenantId,
        facilityId,
        status: { in: ['PENDING', 'APPROVED'] },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { facility: { select: { name: true } } },
    });
    return { available: !conflict, conflict };
  }
}

// ─── 2. Booking Service ───────────────────────────────────────────────────────

export class FacilityBookingService {
  private facilityService = new FacilityService();

  async list(tenantId: string, filters?: { facilityId?: string; status?: BookingStatus; date?: string }) {
    const where: any = { tenantId };
    if (filters?.facilityId) where.facilityId = filters.facilityId;
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.startTime = { gte: d, lt: next };
    }
    return prisma.facilityBooking.findMany({
      where,
      include: { facility: { select: { id: true, name: true, type: true, location: true } } },
      orderBy: { startTime: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const rec = await prisma.facilityBooking.findUnique({
      where: { id },
      include: { facility: true },
    });
    assertOwnership(rec, tenantId, 'Booking');
    return rec;
  }

  async create(tenantId: string, data: any) {
    const parsed = bookingSchema.parse(data);
    // Verify facility belongs to tenant
    await this.facilityService.get(tenantId, parsed.facilityId);
    // Check conflicts
    const { available, conflict } = await this.facilityService.checkAvailability(
      tenantId, parsed.facilityId, parsed.startTime, parsed.endTime
    );
    if (!available) {
      throw new Error(
        `Ruangan sudah dipesan oleh "${conflict?.requestedBy}" pada waktu tersebut.`
      );
    }
    return prisma.facilityBooking.create({
      data: { ...parsed, tenantId },
      include: { facility: { select: { id: true, name: true } } },
    });
  }

  async updateStatus(tenantId: string, id: string, status: BookingStatus, approvedBy?: string) {
    const booking = await this.get(tenantId, id);
    const updated = await prisma.facilityBooking.update({
      where: { id },
      data: { status, approvedBy: approvedBy || null },
      include: { facility: { select: { id: true, name: true } } },
    });

    // Extract memberId from notes if exists
    const match = booking?.notes?.match(/\[MemberId: ([a-f0-9\-]{36})\]/i);
    const memberId = match ? match[1] : null;

    if (memberId) {
      try {
        const { NotificationService } = await import('../notification/notification.service');
        const notificationService = new NotificationService();

        const title = status === 'APPROVED' ? '✅ Peminjaman Fasilitas Disetujui' : '❌ Peminjaman Fasilitas Ditolak';
        const body = status === 'APPROVED'
          ? `Ruangan "${updated.facility?.name}" telah disetujui untuk Anda gunakan.`
          : `Ruangan "${updated.facility?.name}" ditolak untuk peminjaman Anda.`;

        await notificationService.create({
          tenantId,
          memberId,
          type: status === 'APPROVED' ? 'APPROVAL' : 'REJECTION',
          title,
          body,
          data: { bookingId: id }
        });
      } catch (err) {
        console.error('Failed to create booking notification:', err);
      }
    }

    return updated;
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.facilityBooking.delete({ where: { id } });
  }
}

// ─── 3. Equipment Service ─────────────────────────────────────────────────────

export class EquipmentService {
  async list(tenantId: string, filters?: { condition?: EquipmentCondition; category?: string; search?: string }) {
    const where: any = { tenantId };
    if (filters?.condition) where.condition = filters.condition;
    if (filters?.category) where.category = { equals: filters.category, mode: 'insensitive' };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.equipment.findMany({
      where,
      include: { _count: { select: { logs: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async get(tenantId: string, id: string) {
    const rec = await prisma.equipment.findUnique({
      where: { id },
      include: {
        logs: { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    assertOwnership(rec, tenantId, 'Peralatan');
    return rec;
  }

  async create(tenantId: string, data: any) {
    const parsed = equipmentSchema.parse(data);
    return prisma.equipment.create({ data: { ...parsed, tenantId } });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = equipmentSchema.partial().parse(data);
    return prisma.equipment.update({ where: { id }, data: parsed });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.equipment.update({ where: { id }, data: { isActive: false } });
  }

  async addLog(tenantId: string, equipmentId: string, data: any) {
    await this.get(tenantId, equipmentId);
    const parsed = equipmentLogSchema.parse(data);
    // Update equipment condition if maintenance/repair
    if (parsed.action === 'MAINTENANCE' || parsed.action === 'REPAIR') {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { nextMaintenanceDate: null }, // Reset next maintenance
      });
    }
    return prisma.equipmentLog.create({ data: { ...parsed, equipmentId } });
  }
}

// ─── 4. Maintenance Service ───────────────────────────────────────────────────

export class MaintenanceService {
  async list(tenantId: string, filters?: { status?: MaintenanceStatus; type?: string; facilityId?: string }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.facilityId) where.facilityId = filters.facilityId;
    return prisma.maintenanceSchedule.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }],
    });
  }

  async get(tenantId: string, id: string) {
    const rec = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        facility: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
    });
    assertOwnership(rec, tenantId, 'Jadwal maintenance');
    return rec;
  }

  async create(tenantId: string, data: any) {
    const parsed = maintenanceSchema.parse(data);
    return prisma.maintenanceSchedule.create({
      data: {
        ...parsed,
        tenantId,
        facilityId: parsed.facilityId || null,
        equipmentId: parsed.equipmentId || null,
      },
      include: {
        facility: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = maintenanceSchema.partial().parse(data);
    return prisma.maintenanceSchedule.update({
      where: { id },
      data: parsed,
      include: {
        facility: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.maintenanceSchedule.delete({ where: { id } });
  }

  async getOverdue(tenantId: string) {
    const now = new Date();
    return prisma.maintenanceSchedule.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: { lt: now },
      },
      include: {
        facility: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async markOverdue(tenantId: string) {
    const now = new Date();
    return prisma.maintenanceSchedule.updateMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
  }
}

// ─── 5. Utility Service ───────────────────────────────────────────────────────

export class UtilityService {
  async list(tenantId: string, filters?: { type?: UtilityType; year?: number }) {
    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.year) where.year = filters.year;
    return prisma.utilityRecord.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { type: 'asc' }],
    });
  }

  async get(tenantId: string, id: string) {
    const rec = await prisma.utilityRecord.findUnique({ where: { id } });
    assertOwnership(rec, tenantId, 'Rekam utilitas');
    return rec;
  }

  async create(tenantId: string, data: any) {
    const parsed = utilitySchema.parse(data);
    return prisma.utilityRecord.create({ data: { ...parsed, tenantId } });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.get(tenantId, id);
    const parsed = utilitySchema.partial().parse(data);
    return prisma.utilityRecord.update({ where: { id }, data: parsed });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return prisma.utilityRecord.delete({ where: { id } });
  }

  async getSummaryByYear(tenantId: string, year: number) {
    const records = await prisma.utilityRecord.findMany({
      where: { tenantId, year },
      orderBy: [{ type: 'asc' }, { month: 'asc' }],
    });
    // Group by type
    const summary: Record<string, { total: number; months: Record<number, number> }> = {};
    for (const r of records) {
      if (!summary[r.type]) summary[r.type] = { total: 0, months: {} };
      summary[r.type].months[r.month] = r.amount;
      summary[r.type].total += r.amount;
    }
    return { year, records, summary };
  }
}
