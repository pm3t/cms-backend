import { prisma } from '../../prisma';
import { z } from 'zod';
import { CommLogStatus, CommunicationChannel } from '@prisma/client';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export const templateSchema = z.object({
    name: z.string().min(2),
    subject: z.string().min(1),
    body: z.string().min(1),
    channel: z.nativeEnum(CommunicationChannel).default('INBOX')
});

export const bulkMessageSchema = z.object({
    templateId: z.string().uuid(),
    recipientCategory: z.enum(['ALL', 'ADULT', 'YOUTH', 'CHILDREN', 'ELDERLY', 'LEADERS', 'ABSENTEES']),
    metadata: z.record(z.string(), z.any()).optional()
});

export class CommunicationService {
    async listTemplates(tenantId: string) {
        let templates = await prisma.communicationTemplate.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        // Auto-seed default templates if none exist
        if (templates.length === 0) {
            await this.seedDefaultTemplates(tenantId);
            templates = await prisma.communicationTemplate.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' }
            });
        }

        return templates;
    }

    async seedDefaultTemplates(tenantId: string) {
        const defaultTemplates = [
            {
                name: 'Follow-up: Sapaan Rindu Kehadiran',
                subject: 'Shalom {{name}}, kami merindukan persekutuan bersamamu',
                body: 'Shalom {{name}}, semoga minggu ini berjalan dengan penuh sukacita dan damai sejahtera. Kami dari tim penggembalaan gereja sangat merindukan persekutuan bersama {{name}}. Sampai jumpa di ibadah minggu ini ya! 🙏',
                channel: CommunicationChannel.INBOX,
                tenantId
            },
            {
                name: 'Follow-up: Ketidakhadiran (3+ Minggu)',
                subject: 'Salam & Perhatian Penggembalaan untuk {{name}}',
                body: 'Shalom {{name}}, kami memperhatikan {{name}} sudah beberapa minggu belum sempat hadir di persekutuan ibadah / komsel. Apabila ada hal yang dapat kami bantu atau pokok doa yang perlu didukung, tim pengerja gereja siap mendampingi {{name}}. Tentukan waktu untuk ngobrol bersama kami ya! ❤️',
                channel: CommunicationChannel.INBOX,
                tenantId
            },
            {
                name: 'Follow-up: Undangan Persekutuan Komsel',
                subject: 'Undangan Persekutuan Komsel untuk {{name}}',
                body: 'Halo {{name}}, persekutuan kelompok sel (komsel) rindu menyambutmu kembali. Mari bergabung dalam persekutuan doa dan saling menguatkan minggu ini! 🙏',
                channel: CommunicationChannel.INBOX,
                tenantId
            }
        ];

        for (const t of defaultTemplates) {
            await prisma.communicationTemplate.create({ data: t });
        }
    }

    async createTemplate(tenantId: string, data: any) {
        const parsed = templateSchema.parse(data);
        return prisma.communicationTemplate.create({
            data: { ...parsed, tenantId }
        });
    }

    async updateTemplate(tenantId: string, id: string, data: any) {
        const parsed = templateSchema.partial().parse(data);
        return prisma.communicationTemplate.updateMany({
            where: { id, tenantId },
            data: parsed
        });
    }

    async deleteTemplate(tenantId: string, id: string) {
        return prisma.communicationTemplate.deleteMany({
            where: { id, tenantId }
        });
    }

    async listLogs(tenantId: string) {
        const logs = await prisma.communicationLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const members = await prisma.member.findMany({
            where: { tenantId },
            select: { id: true, firstName: true, lastName: true }
        });

        const memberMap = new Map<string, string>();
        for (const m of members) {
            memberMap.set(m.id, `${m.firstName} ${m.lastName || ''}`.trim());
        }

        return logs.map(log => ({
            ...log,
            recipient: memberMap.get(log.recipient) || log.recipient
        }));
    }

    /**
     * Send message to multiple recipients based on category
     */
    async sendBulkMessage(tenantId: string, data: any) {
        const { templateId, recipientCategory } = bulkMessageSchema.parse(data);
        
        const template = await prisma.communicationTemplate.findFirst({
            where: { id: templateId, tenantId }
        });
        if (!template) throw new Error('Template not found');

        // Find recipients
        let recipients;
        if (recipientCategory === 'LEADERS') {
            recipients = await prisma.member.findMany({
                where: {
                    tenantId,
                    status: 'ACTIVE',
                    OR: [
                        {
                            smallGroupMemberships: {
                                some: {
                                    role: {
                                        in: ['LEADER', 'ASSISTANT', 'TREASURER']
                                    }
                                }
                            }
                        },
                        {
                            ministryMemberships: {
                                some: {
                                    role: {
                                        in: ['LEADER', 'STAFF']
                                    }
                                }
                            }
                        }
                    ]
                }
            });
        } else if (recipientCategory === 'ABSENTEES') {
            const { AttendanceService } = await import('../attendance/attendance.service');
            const attendanceService = new AttendanceService();
            const absentees = await attendanceService.getAbsenteesReport(tenantId, { days: 21 });
            const absenteeIds = absentees.map(a => a.id);
            recipients = await prisma.member.findMany({
                where: { tenantId, id: { in: absenteeIds } }
            });
        } else {
            const query: any = { tenantId, status: 'ACTIVE' };
            if (recipientCategory !== 'ALL') {
                query.category = recipientCategory;
            }
            recipients = await prisma.member.findMany({ where: query });
        }
        
        console.log(`[CommunicationService] Starting bulk job for ${recipients.length} recipients via ${template.channel}`);

        // Process concurrently and wait to prevent Vercel Serverless CPU freezing
        const sendPromises = recipients.map(async (recipient) => {
            const target = recipient.id;

            const fullName = `${recipient.firstName} ${recipient.lastName || ''}`.trim();
            const replaceVars = (str: string) => {
                return str.replace(/\{\{name\}\}/gi, fullName);
            };

            const formattedSubject = replaceVars(template.subject);
            const formattedBody = replaceVars(template.body);

            await this.sendMessage(tenantId, {
                recipient: target,
                subject: formattedSubject,
                body: formattedBody,
                channel: 'INBOX'
            });

            // Automatically log Pastoral Visitation if category is ABSENTEES
            if (recipientCategory === 'ABSENTEES') {
                await prisma.pastoralVisitation.create({
                    data: {
                        tenantId,
                        memberId: recipient.id,
                        visitorName: 'Tim Pastoral (Bulk In-App Message)',
                        visitDate: new Date(),
                        type: 'INAPP',
                        status: 'COMPLETED',
                        purpose: 'Follow-up Ketidakhadiran Massal',
                        notes: formattedBody
                    }
                });
            }
        });

        await Promise.all(sendPromises);

        return { jobStarted: true, recipientCount: recipients.length };
    }

    /**
     * Send Bulk In-App Messages to specific Absentee Member IDs
     */
    async sendBulkAbsenteeMessages(tenantId: string, data: { memberIds?: string[]; templateId?: string; subject?: string; body?: string; visitorName?: string }) {
        let memberIds = data.memberIds;

        if (!memberIds || memberIds.length === 0) {
            const { AttendanceService } = await import('../attendance/attendance.service');
            const attendanceService = new AttendanceService();
            const absentees = await attendanceService.getAbsenteesReport(tenantId, { days: 21 });
            memberIds = absentees.map(a => a.id);
        }

        if (memberIds.length === 0) {
            return { sentCount: 0, message: 'Tidak ada jemaat jarang hadir yang perlu dikirimkan pesan.' };
        }

        let subject = data.subject;
        let body = data.body;

        if (data.templateId) {
            const template = await prisma.communicationTemplate.findFirst({
                where: { id: data.templateId, tenantId }
            });
            if (template) {
                subject = template.subject;
                body = template.body;
            }
        }

        if (!subject || !body) {
            throw new Error('Judul dan isi pesan wajib diisi');
        }

        const members = await prisma.member.findMany({
            where: { tenantId, id: { in: memberIds } }
        });

        const visitor = data.visitorName || 'Tim Pastoral (Pesan In-App)';

        const promises = members.map(async (m) => {
            const fullName = `${m.firstName} ${m.lastName || ''}`.trim();
            const formattedSubject = subject!.replace(/\{\{name\}\}/gi, fullName);
            const formattedBody = body!.replace(/\{\{name\}\}/gi, fullName);

            // 1. Send In-App Inbox Notification
            await this.sendMessage(tenantId, {
                recipient: m.id,
                subject: formattedSubject,
                body: formattedBody,
                channel: 'INBOX'
            });

            // 2. Automatically log Pastoral Visitation Follow-up
            await prisma.pastoralVisitation.create({
                data: {
                    tenantId,
                    memberId: m.id,
                    visitorName: visitor,
                    visitDate: new Date(),
                    type: 'INAPP',
                    status: 'COMPLETED',
                    purpose: 'Follow-up Ketidakhadiran (Pesan In-App)',
                    notes: formattedBody
                }
            });
        });

        await Promise.all(promises);

        return { sentCount: members.length, success: true };
    }

    /**
     * Unified send message handler to INBOX (saving in Notification table)
     */
    async sendMessage(tenantId: string, data: { recipient: string; subject: string; body: string; channel: CommunicationChannel; qrContent?: string }) {
        // Find member by ID, Email, or Phone
        const member = await prisma.member.findFirst({
            where: {
                tenantId,
                OR: [
                    { id: data.recipient },
                    { email: data.recipient },
                    { phone: data.recipient }
                ]
            }
        });

        // Create In-App Inbox Notification
        if (member) {
            await prisma.notification.create({
                data: {
                    tenantId,
                    memberId: member.id,
                    type: 'SYSTEM',
                    title: data.subject,
                    body: data.body,
                    data: data.qrContent ? { qrContent: data.qrContent } : undefined
                }
            });
        } else {
            // If no member found (e.g. sent to tenant admin/billing email), we still create a general notification
            await prisma.notification.create({
                data: {
                    tenantId,
                    memberId: null,
                    type: 'SYSTEM',
                    title: data.subject,
                    body: data.body,
                    data: data.qrContent ? { qrContent: data.qrContent } : undefined
                }
            });
        }

        const recipientLabel = member ? `${member.firstName} ${member.lastName || ''}`.trim() : data.recipient;

        const log = await prisma.communicationLog.create({
            data: {
                tenantId,
                recipient: recipientLabel,
                subject: data.subject,
                body: data.body,
                channel: 'INBOX',
                status: 'SENT'
            }
        });

        return log;
    }

    async triggerMockEmail(tenantId: string, data: { recipient: string; subject: string; body: string; qrContent?: string }) {
        // triggerMockEmail is deprecated / redirected to sendMessage via INBOX
        return this.sendMessage(tenantId, {
            recipient: data.recipient,
            subject: data.subject,
            body: data.body,
            channel: 'INBOX',
            qrContent: data.qrContent
        });
    }
}
