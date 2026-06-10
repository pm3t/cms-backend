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
    recipientCategory: z.enum(['ALL', 'ADULT', 'YOUTH', 'CHILDREN', 'ELDERLY', 'LEADERS']),
    metadata: z.record(z.string(), z.any()).optional()
});

export class CommunicationService {
    async listTemplates(tenantId: string) {
        return prisma.communicationTemplate.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
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

            // Simple variable replacement
            const fullName = `${recipient.firstName} ${recipient.lastName || ''}`.trim();
            const replaceVars = (str: string) => {
                return str.replace(/\{\{name\}\}/gi, fullName);
            };

            await this.sendMessage(tenantId, {
                recipient: target,
                subject: replaceVars(template.subject),
                body: replaceVars(template.body),
                channel: 'INBOX'
            });
        });

        await Promise.all(sendPromises);

        return { jobStarted: true, recipientCount: recipients.length };
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
