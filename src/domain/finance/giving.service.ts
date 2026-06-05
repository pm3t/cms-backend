import { prisma } from '../../prisma';
import { Xendit } from 'xendit-node';

let secretKey = (process.env.XENDIT_SECRET_KEY || '').trim();
secretKey = secretKey.replace(/^["'](.+)["']$/, '$1');

const xenditClient = new Xendit({
    secretKey: secretKey
});

const xenditInvoiceClient = xenditClient.Invoice;

export class GivingService {
    async createDonationInvoice(tenantId: string, data: { 
        amount: number, 
        memberId?: string, 
        projectId?: string, 
        category: string,
        description: string,
        donorEmail: string,
        donorName: string
    }) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new Error('Tenant not found');

        const externalId = `DON-\${tenantId}-\${Date.now()}`;

        const response = await xenditInvoiceClient.createInvoice({
            data: {
                externalId: externalId,
                amount: data.amount,
                payerEmail: data.donorEmail,
                description: `Donasi untuk \${tenant.name}: \${data.description}`,
                shouldSendEmail: true,
                customer: {
                    givenNames: data.donorName,
                    email: data.donorEmail
                },
                metadata: {
                    tenantId,
                    memberId: data.memberId,
                    projectId: data.projectId,
                    category: data.category,
                    description: data.description,
                    type: 'ONLINE_DONATION'
                }
            }
        });

        return response;
    }

    async handleXenditCallback(payload: any) {
        const { external_id, status, amount, metadata } = payload;
        
        if (status === 'PAID' && metadata?.type === 'ONLINE_DONATION') {
            const { tenantId, memberId, projectId, category, description } = metadata;

            // Check if already processed
            const existing = await prisma.financialRecord.findUnique({ where: { externalId: external_id } });
            if (existing) return;

            // Generate receipt code
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const receiptCode = `DON-\${dateStr}-\${randomStr}`;

            await prisma.financialRecord.create({
                data: {
                    tenantId,
                    type: 'DONATION',
                    amount: parseFloat(amount),
                    category,
                    description: `[Online] \${description}`,
                    memberId: memberId || null,
                    projectId: projectId || null,
                    paymentStatus: 'COMPLETED',
                    paymentMethod: 'XENDIT',
                    externalId: external_id,
                    receiptCode
                }
            });
        }
    }
}
