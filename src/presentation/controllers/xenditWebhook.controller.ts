import { Request, Response } from 'express';
import { prisma } from '../../prisma';
import { CommunicationService } from '../../domain/communication/communication.service';
import { BillingService } from '../../domain/billing/billing.service';

/*
 * Example Xendit Invoice webhook payload (for testing reference):
 *
 * {
 *   "id": "593f4ed1c3d3bb7f39733d83",
 *   "external_id": "cms-invoice-<your-invoice-uuid>",
 *   "user_id": "5781d19b2e2385880609791c",
 *   "is_high": true,
 *   "payment_method": "BANK_TRANSFER",
 *   "status": "PAID",
 *   "merchant_name": "Xendit",
 *   "amount": 150000,
 *   "paid_amount": 150000,
 *   "paid_at": "2016-10-12T08:15:03.404Z",
 *   "payer_email": "test@gmail.com",
 *   "description": "Test Invoice",
 *   "adjusted_received_amount": 150000,
 *   "fees_paid_amount": 0,
 *   "updated": "2016-10-10T08:15:03.404Z",
 *   "created": "2016-10-10T08:15:03.404Z",
 *   "currency": "IDR",
 *   "payment_channel": "BNI",
 *   "payment_destination": "888888888888"
 * }
 */

import { emailTemplates } from '../../domain/billing/emailTemplates';

import { GivingService } from '../../domain/finance/giving.service';

const communicationService = new CommunicationService();
const billingService = new BillingService();
const givingService = new GivingService();

export async function xenditWebhookHandler(req: Request, res: Response) {
    // Always return 200 to Xendit, even on internal errors
    try {
        // 1. Verify callback token
        const callbackToken = req.headers['x-callback-token'];
        const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

        if (!expectedToken || callbackToken !== expectedToken) {
            console.warn('[XenditWebhook] Rejected: invalid callback token');
            return res.status(401).json({ error: 'Invalid callback token' });
        }

        const payload = req.body;
        const externalId: string = payload.external_id || '';
        const xenditStatus: string = payload.status || '';

        console.log(`[XenditWebhook] Received: externalId=${externalId}, status=${xenditStatus}`);

        // Handle Donation (prefix DON-)
        if (externalId.startsWith('DON-')) {
            await givingService.handleXenditCallback(payload);
            return res.status(200).json({ received: true });
        }

        // 2. Find our invoice by matching the external_id pattern "cms-invoice-<uuid>"
        const invoiceUuid = externalId.replace('cms-invoice-', '');
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceUuid },
            include: {
                tenant: true,
                subscription: { include: { plan: true } }
            }
        });

        if (!invoice) {
            console.warn(`[XenditWebhook] Invoice not found for externalId: ${externalId}`);
            return res.status(200).json({ received: true, warning: 'Invoice not found' });
        }

        const tenantId = invoice.tenantId;
        const tenantEmail = invoice.tenant.email || '';
        const tenantName = invoice.tenant.name;

        // 3. Process by status
        if (xenditStatus === 'PAID') {
            await handlePaid(invoice as any, tenantId, tenantEmail, tenantName, payload);
        } else if (xenditStatus === 'EXPIRED' || xenditStatus === 'FAILED') {
            await handleFailedOrExpired(invoice as any, tenantId, tenantEmail, tenantName, xenditStatus);
        } else {
            console.log(`[XenditWebhook] Unhandled status: ${xenditStatus}, skipping`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        // Log error but still return 200 so Xendit doesn't retry infinitely
        console.error('[XenditWebhook] Internal error:', error.message);
        return res.status(200).json({ received: true, error: 'Internal processing error' });
    }
}

async function handlePaid(invoice: any, tenantId: string, tenantEmail: string, tenantName: string, payload: any) {
    const paidAt = payload.paid_at ? new Date(payload.paid_at) : new Date();

    // a. Update invoice status
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'paid', paidAt }
    });

    // b. Update subscription: set active, extend end date by 30 days
    if (invoice.subscriptionId) {
        const currentSub = await prisma.subscription.findUnique({
            where: { id: invoice.subscriptionId }
        });

        if (currentSub) {
            const newEndDate = new Date(currentSub.endDate);
            newEndDate.setDate(newEndDate.getDate() + 30);

            await prisma.subscription.update({
                where: { id: invoice.subscriptionId },
                data: {
                    status: 'active',
                    endDate: newEndDate,
                    gracePeriodEndsAt: null,
                    suspendedAt: null
                }
            });
        }
    }

    // c. Send payment confirmation email
    if (tenantEmail) {
        const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
            parseFloat(invoice.amount.toString())
        );
        await communicationService.triggerMockEmail(tenantId, {
            recipient: tenantEmail,
            subject: `Konfirmasi Pembayaran Berhasil - ${amountStr}`,
            body: emailTemplates.payment_success(tenantName, amountStr, paidAt.toLocaleDateString('id-ID'))
        });
    }

    console.log(`[XenditWebhook] Invoice ${invoice.id} marked PAID, subscription extended.`);
}

async function handleFailedOrExpired(
    invoice: any,
    tenantId: string,
    tenantEmail: string,
    tenantName: string,
    status: string
) {
    // a. Update invoice status to failed
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'failed' }
    });

    // b. Update subscription to past_due, set grace period = now + 7 days
    if (invoice.subscriptionId) {
        const gracePeriodEndsAt = new Date();
        gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 7);

        await prisma.subscription.update({
            where: { id: invoice.subscriptionId },
            data: { status: 'past_due', gracePeriodEndsAt }
        });
    }

    // c. Send payment failure notification email
    if (tenantEmail) {
        const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
            parseFloat(invoice.amount.toString())
        );
        await communicationService.triggerMockEmail(tenantId, {
            recipient: tenantEmail,
            subject: `Pembayaran Gagal - Tindakan Diperlukan`,
            body: emailTemplates.payment_failed(tenantName, amountStr, 7)
        });
    }

    console.log(`[XenditWebhook] Invoice ${invoice.id} marked FAILED, subscription set to past_due.`);
}
