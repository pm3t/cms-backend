import { prisma } from '../../prisma';
import { z } from 'zod';
import { RegistrationStatus } from '@prisma/client';
import { CommunicationService } from '../communication/communication.service';

import { subscriptionService } from '../subscription/subscription.service';

const commService = new CommunicationService();

export const createEventSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    type: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    location: z.string().optional(),
    capacity: z.number().nullable().optional(),
    isRegistrationOpen: z.boolean().default(true)
});

export const eventRegistrationSchema = z.object({
    name: z.string().min(3),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    memberId: z.string().uuid().optional().nullable()
});

export class EventService {
    async createEvent(tenantId: string, data: any) {
        const isEnabled = await subscriptionService.isFeatureEnabled(tenantId, 'event_management');
        if (!isEnabled) {
            throw new Error('Upgrade Required: Fitur Manajemen Event tidak tersedia di paket Anda.');
        }

        const validated = createEventSchema.parse(data);
        return prisma.event.create({
            data: {
                tenantId,
                title: validated.title,
                description: validated.description,
                type: validated.type,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                location: validated.location,
                capacity: validated.capacity,
                isRegistrationOpen: validated.isRegistrationOpen
            }
        });
    }

    async updateEvent(tenantId: string, eventId: string, data: any) {
        const validated = createEventSchema.parse(data);
        return prisma.event.update({
            where: { id: eventId, tenantId },
            data: {
                title: validated.title,
                description: validated.description,
                type: validated.type,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                location: validated.location,
                capacity: validated.capacity,
                isRegistrationOpen: validated.isRegistrationOpen
            }
        });
    }

    async getEvents(tenantId: string, includeClosed: boolean = true) {
        const whereClause: any = { tenantId };
        if (!includeClosed) {
            whereClause.endDate = { gte: new Date() };
        }
        return prisma.event.findMany({
            where: whereClause,
            orderBy: { startDate: 'asc' },
            include: {
                _count: {
                    select: { registrations: true }
                }
            }
        });
    }

    async getEventDetails(eventId: string) {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                registrations: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!event) throw new Error('Event not found');
        return event;
    }

    async getPublicEventSummary(eventId: string) {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                description: true,
                startDate: true,
                endDate: true,
                location: true,
                capacity: true,
                isRegistrationOpen: true,
                _count: {
                    select: { registrations: { where: { status: RegistrationStatus.REGISTERED } } }
                }
            }
        });
        if (!event) throw new Error('Event not found');
        return event;
    }

    async deleteEvent(tenantId: string, eventId: string) {
        return prisma.event.delete({
            where: { id: eventId, tenantId }
        });
    }

    async registerForEvent(eventId: string, data: any) {
        const validated = eventRegistrationSchema.parse(data);

        // Transaction to ensure capacity isn't overbooked
        return prisma.$transaction(async (tx) => {
            const event = await tx.event.findUnique({
                where: { id: eventId },
                include: {
                    _count: {
                        select: {
                            registrations: {
                                where: { status: 'REGISTERED' }
                            }
                        }
                    }
                }
            });

            if (!event) throw new Error('Event not found');
            if (!event.isRegistrationOpen) throw new Error('Registration is closed for this event');

            // Deduplication (by email if provided)
            if (validated.email) {
                const existing = await tx.eventRegistration.findUnique({
                    where: { eventId_email: { eventId, email: validated.email } }
                });
                if (existing) throw new Error('You have already registered for this event');
            }

            // Capacity logic
            let assignedStatus: RegistrationStatus = RegistrationStatus.REGISTERED;
            if (event.capacity !== null) {
                if (event._count.registrations >= event.capacity) {
                    assignedStatus = RegistrationStatus.WAITLISTED;
                }
            }

            const registration = await tx.eventRegistration.create({
                data: {
                    eventId,
                    memberId: validated.memberId,
                    name: validated.name,
                    email: validated.email,
                    phone: validated.phone,
                    status: assignedStatus
                }
            });

            // Trigger automated confirmation email if email provided
            if (validated.email) {
                const subject = `Registration ${assignedStatus === RegistrationStatus.WAITLISTED ? 'Waitlisted' : 'Confirmed'}: ${event.title}`;
                const body = `Hi ${validated.name},\n\nYour registration for "${event.title}" has been ${assignedStatus === RegistrationStatus.WAITLISTED ? 'placed on the waitlist' : 'confirmed'}.\n\nDetails:\nDate: ${event.startDate.toLocaleString()}\nLocation: ${event.location || 'N/A'}\n\nThank you!`;

                // Fire and forget (it is mock anyway)
                commService.triggerMockEmail(event.tenantId, {
                    recipient: validated.email,
                    subject,
                    body,
                    qrContent: registration.id
                });
            }

            return registration;
        });
    }

    async sendBulkReminders(tenantId: string, eventId: string) {
        const event = await prisma.event.findUnique({
            where: { id: eventId, tenantId },
            include: {
                registrations: {
                    where: {
                        status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] },
                        email: { not: null }
                    }
                }
            }
        });

        if (!event) throw new Error('Event not found');
        if (event.registrations.length === 0) return { count: 0 };

        for (const reg of event.registrations) {
            if (reg.email) {
                await commService.triggerMockEmail(tenantId, {
                    recipient: reg.email,
                    subject: `REMINDER: Upcoming Event - ${event.title}`,
                    body: `Hi ${reg.name},\n\nThis is a reminder for the upcoming event "${event.title}" on ${event.startDate.toLocaleString()}.\n\nLocation: ${event.location || 'N/A'}\n\nWe look forward to seeing you!`,
                    qrContent: reg.id
                });
            }
        }

        return { count: event.registrations.length };
    }

    async checkInRegistration(tenantId: string, eventId: string, registrationId: string, status: RegistrationStatus) {
        // Just verify event belongs to tenant
        const event = await prisma.event.findFirst({
            where: { id: eventId, tenantId }
        });
        if (!event) throw new Error('Unauthorized or event not found');

        const updateData: any = { status };
        if (status === RegistrationStatus.ATTENDED) {
            updateData.checkInTime = new Date();
        } else {
            updateData.checkInTime = null;
        }

        return prisma.eventRegistration.update({
            where: { id: registrationId },
            data: updateData
        });
    }
}
