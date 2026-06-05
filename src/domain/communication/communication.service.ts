import { prisma } from '../../prisma';
import { z } from 'zod';
import { CommLogStatus, CommunicationChannel } from '@prisma/client';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export const templateSchema = z.object({
    name: z.string().min(2),
    subject: z.string().min(1),
    body: z.string().min(1),
    channel: z.nativeEnum(CommunicationChannel).default('EMAIL')
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
        return prisma.communicationLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
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
        const query: any = { tenantId, status: 'ACTIVE' };
        if (recipientCategory !== 'ALL' && recipientCategory !== 'LEADERS') {
            query.category = recipientCategory;
        }
        
        // If LEADERS, we might need a different logic depending on Role, 
        // but for now let's assume Members have a way to be identified as leaders 
        // or just fetch all for this simplified implementation.
        
        const recipients = await prisma.member.findMany({ where: query });
        
        console.log(`[CommunicationService] Starting bulk job for \${recipients.length} recipients via \${template.channel}`);

        // Process in background (mocking a worker)
        recipients.forEach(async (recipient) => {
            const target = template.channel === 'EMAIL' ? recipient.email : recipient.phone;
            if (!target) return;

            // Simple variable replacement
            const fullName = `\${recipient.firstName} \${recipient.lastName || ''}`.trim();
            const replaceVars = (str: string) => {
                return str.replace(/\{\{name\}\}/gi, fullName);
            };

            await this.sendMessage(tenantId, {
                recipient: target,
                subject: replaceVars(template.subject),
                body: replaceVars(template.body),
                channel: template.channel
            });
        });

        return { jobStarted: true, recipientCount: recipients.length };
    }

    /**
     * Unified send message handler
     */
    async sendMessage(tenantId: string, data: { recipient: string; subject: string; body: string; channel: CommunicationChannel; qrContent?: string }) {
        if (data.channel === 'EMAIL') {
            return this.triggerMockEmail(tenantId, data);
        }

        // Handle SMS, WhatsApp, Push (Mock)
        const log = await prisma.communicationLog.create({
            data: {
                tenantId,
                recipient: data.recipient,
                subject: data.subject,
                body: data.body,
                channel: data.channel,
                status: 'PENDING'
            }
        });

        // Simulating async delivery
        setTimeout(async () => {
            const isSuccess = Math.random() > 0.05;
            await prisma.communicationLog.update({
                where: { id: log.id },
                data: {
                    status: isSuccess ? 'SENT' : 'FAILED',
                    errorDetail: isSuccess ? null : `Mock Failure: Provider for \${data.channel} not connected`
                }
            });
            console.log(`[CommunicationService] \${data.channel} sent to \${data.recipient}: \${isSuccess ? 'SUCCESS' : 'FAILED'}`);
        }, 1500);

        return log;
    }

    async triggerMockEmail(tenantId: string, data: { recipient: string; subject: string; body: string; qrContent?: string }) {
        const log = await prisma.communicationLog.create({
            data: {
                tenantId,
                recipient: data.recipient,
                subject: data.subject,
                body: data.body,
                channel: 'EMAIL',
                status: 'PENDING'
            }
        });

        const transporter = this.getTransporter();
        const htmlBody = data.qrContent
            ? `<div style="font-family: sans-serif; padding: 20px;">
                <p>\${data.body.replace(/\n/g, '<br>')}</p>
                <div style="margin-top: 30px; padding: 15px; border: 1px solid #eee; display: inline-block; text-align: center;">
                    <p style="font-size: 12px; color: #666; margin-bottom: 10px;">SCAN FOR CHECK-IN</p>
                    <img src="cid:qrcode" alt="Check-in QR Code" />
                    <p style="font-size: 10px; color: #999; margin-top: 5px;">ID: \${data.qrContent}</p>
                </div>
               </div>`
            : undefined;

        if (!transporter) {
            setTimeout(async () => {
                try {
                    const isSuccess = Math.random() > 0.05;
                    await prisma.communicationLog.update({
                        where: { id: log.id },
                        data: {
                            status: isSuccess ? 'SENT' : 'FAILED',
                            errorDetail: isSuccess ? null : 'Mock Failure: SMTP not configured'
                        }
                    });
                } catch (err) {
                    console.error("Failed to update notification log", err);
                }
            }, 2000);
            return log;
        }

        try {
            const mailOptions: any = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: data.recipient,
                subject: data.subject,
                text: data.body,
                html: htmlBody
            };

            if (data.qrContent) {
                const qrBuffer = await QRCode.toBuffer(data.qrContent);
                mailOptions.attachments = [{
                    filename: 'qrcode.png',
                    content: qrBuffer,
                    cid: 'qrcode'
                }];
            }

            await transporter.sendMail(mailOptions);

            await prisma.communicationLog.update({
                where: { id: log.id },
                data: { status: 'SENT' }
            });
        } catch (error: any) {
            console.error("SMTP Error:", error);
            await prisma.communicationLog.update({
                where: { id: log.id },
                data: {
                    status: 'FAILED',
                    errorDetail: error.message
                }
            });
        }

        return log;
    }

    private getTransporter() {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return null;
        }

        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
}
