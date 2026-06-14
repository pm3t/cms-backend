import { prisma } from '../../prisma';
import { z } from 'zod';
import { RegistrationStatus } from '@prisma/client';

export const serviceSchema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    startTime: z.string().optional(),
    location: z.string().optional(),
});

export const checkInSchema = z.object({
    memberId: z.string().uuid().optional(),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    worshipServiceId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    date: z.string().optional(), // YYYY-MM-DD
    method: z.enum(['MANUAL', 'QR']).default('MANUAL'),
});

export class AttendanceService {
    // Service Management
    async createService(tenantId: string, data: any) {
        const validated = serviceSchema.parse(data);
        return prisma.worshipService.create({
            data: { ...validated, tenantId }
        });
    }

    async listServices(tenantId: string) {
        return prisma.worshipService.findMany({
            where: { tenantId, isActive: true }
        });
    }

    async updateService(tenantId: string, id: string, data: any) {
        const validated = serviceSchema.partial().parse(data);
        const service = await prisma.worshipService.findUnique({ where: { id } });
        if (!service || service.tenantId !== tenantId) throw new Error('Service not found');

        return prisma.worshipService.update({
            where: { id },
            data: validated
        });
    }

    async deleteService(tenantId: string, id: string) {
        const service = await prisma.worshipService.findUnique({ where: { id } });
        if (!service || service.tenantId !== tenantId) throw new Error('Service not found');

        return prisma.worshipService.update({
            where: { id },
            data: { isActive: false }
        });
    }

    // Check-in Logic
    async recordAttendance(tenantId: string, data: any) {
        const validated = checkInSchema.parse(data);
        const date = validated.date ? new Date(validated.date) : new Date();
        date.setHours(0, 0, 0, 0); // Normalize to local midnight for uniqueness

        return await prisma.$transaction(async (tx) => {
            let actualMemberId = validated.memberId;
            let guestName = validated.guestName;
            let guestPhone = validated.guestPhone;

            // Handle event check-in via registration ID
            if (validated.eventId && validated.memberId) {
                // Check if the provided memberId is actually a registration ID
                const registration = await tx.eventRegistration.findUnique({
                    where: { id: validated.memberId }
                });

                if (registration && registration.eventId === validated.eventId) {
                    if (registration.status === RegistrationStatus.ATTENDED) {
                        throw new Error('Member already checked in for this session today');
                    }

                    // Update registration status
                    await tx.eventRegistration.update({
                        where: { id: registration.id },
                        data: {
                            status: RegistrationStatus.ATTENDED,
                            checkInTime: new Date()
                        }
                    });

                    // Set actual fields for AttendanceRecord
                    if (registration.memberId) {
                        actualMemberId = registration.memberId;
                    } else {
                        actualMemberId = undefined; // Guest
                        guestName = registration.name;
                        guestPhone = registration.phone || undefined;
                    }
                } else {
                    // Try to find a registration for this member for the event
                    const memberRegistration = await tx.eventRegistration.findFirst({
                        where: {
                            eventId: validated.eventId,
                            memberId: validated.memberId
                        }
                    });

                    if (memberRegistration) {
                        await tx.eventRegistration.update({
                            where: { id: memberRegistration.id },
                            data: {
                                status: RegistrationStatus.ATTENDED,
                                checkInTime: new Date()
                            }
                        });
                    }
                }
            } else if (validated.eventId && !validated.memberId && (validated.guestName || validated.guestPhone)) {
                // Manual guest check-in for event
                // Find if there's any matching registration
                const guestReg = await tx.eventRegistration.findFirst({
                    where: {
                        eventId: validated.eventId,
                        name: validated.guestName,
                        phone: validated.guestPhone
                    }
                });

                if (guestReg) {
                    await tx.eventRegistration.update({
                        where: { id: guestReg.id },
                        data: {
                            status: RegistrationStatus.ATTENDED,
                            checkInTime: new Date()
                        }
                    });
                }
            }

            // Check if already checked in today for this service/event (only for registered members)
            if (actualMemberId) {
                const existing = await tx.attendanceRecord.findFirst({
                    where: {
                        tenantId,
                        memberId: actualMemberId,
                        worshipServiceId: validated.worshipServiceId,
                        eventId: validated.eventId,
                        date: date
                    }
                });
                if (existing) throw new Error('Member already checked in for this session today');
            }

            // Create attendance record
            return tx.attendanceRecord.create({
                data: {
                    tenantId,
                    memberId: actualMemberId || null,
                    guestName: guestName || null,
                    guestPhone: guestPhone || null,
                    worshipServiceId: validated.worshipServiceId,
                    eventId: validated.eventId,
                    date: date,
                    method: validated.method,
                }
            });
        });
    }

    async getHistory(tenantId: string, filters: any = {}) {
        return prisma.attendanceRecord.findMany({
            where: {
                tenantId,
                ...filters
            },
            include: {
                member: true,
                worshipService: true,
                event: true
            },
            orderBy: { checkInTime: 'desc' },
            take: 100
        });
    }

    async getStats(tenantId: string) {
        const totalAttendance = await prisma.attendanceRecord.count({ where: { tenantId } });
        const recentLog = await prisma.attendanceRecord.groupBy({
            by: ['date'],
            where: { tenantId },
            _count: { id: true },
            orderBy: { date: 'desc' },
            take: 7
        });

        return {
            total: totalAttendance,
            trends: recentLog.map((day: any) => ({
                date: day.date,
                count: day._count.id
            }))
        };
    }

    // Basic Absentee Follow-up Alert
    // Identify active members who haven't attended any service in the last 21 days
    async getAbsentees(tenantId: string) {
        const threeWeeksAgo = new Date();
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

        const activeMembers = await prisma.member.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
                attendance: {
                    none: {
                        date: { gte: threeWeeksAgo }
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
            }
        });

        return activeMembers;
    }
}
