import { Xendit } from 'xendit-node';
import { prisma } from '../../prisma';

let secretKey = (process.env.XENDIT_SECRET_KEY || '').trim();
// Remove quotes if they exist (sometimes dotenv includes them if not formatted correctly)
secretKey = secretKey.replace(/^["'](.+)["']$/, '$1');

if (!secretKey) {
    console.error('[XenditService] CRITICAL: XENDIT_SECRET_KEY is empty');
} else {
    console.log(`[XenditService] Initializing with key: ${secretKey.substring(0, 8)}...${secretKey.substring(secretKey.length - 4)}`);
}

const xenditClient = new Xendit({
    secretKey: secretKey
});
const xenditInvoiceClient = xenditClient.Invoice;

export class XenditService {
    /**
     * Create a Xendit invoice and persist xendit fields to DB
     */
    async createInvoice(params: {
        tenantId: string;
        invoiceId: string;
        amount: number;
        description: string;
        payerEmail: string;
        payerName: string;
    }): Promise<{ xenditInvoiceId: string; invoiceUrl: string; expiryDate: Date }> {
        const { invoiceId, amount, description, payerEmail, payerName } = params;

        const externalId = `cms-invoice-${invoiceId}`;
        console.log(`[XenditService] Creating invoice for ${payerEmail}, amount: ${amount}`);

        try {
            // Call Xendit Invoice API
            const xenditInvoice = await xenditInvoiceClient.createInvoice({
                data: {
                    externalId,
                    amount,
                    description,
                    payerEmail,
                    customer: {
                        givenNames: payerName,
                        email: payerEmail
                    },
                    invoiceDuration: 86400, // 24 hours
                    currency: 'IDR',
                    reminderTime: 1,
                    shouldSendEmail: false 
                }
            });

            if (!xenditInvoice.id) {
                throw new Error('Xendit did not return an invoice ID');
            }

            return {
                xenditInvoiceId: xenditInvoice.id,
                invoiceUrl: xenditInvoice.invoiceUrl,
                expiryDate: new Date(xenditInvoice.expiryDate)
            };
        } catch (err: any) {
            console.error('[XenditService] Xendit API Error Details:', {
                status: err.status,
                code: err.code,
                message: err.message,
                response: err.response?.data
            });
            throw err;
        }
    }

    /**
     * Retrieve current status of a Xendit invoice by its Xendit ID
     */
    async getInvoiceStatus(xenditInvoiceId: string): Promise<{
        status: string;
        paidAt?: Date;
    }> {
        const xenditInvoice = await xenditInvoiceClient.getInvoiceById({
            invoiceId: xenditInvoiceId
        });

        return {
            status: xenditInvoice.status as string,
            paidAt: undefined // Xendit Invoice model doesn't expose paidAt directly in v6
        };
    }
}
