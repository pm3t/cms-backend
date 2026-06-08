import { PrismaClient as PrismaNeon } from '@prisma/client';
import { PrismaClient as PrismaLocal } from '@prisma/client';

async function run() {
  console.log('Syncing plans, subscriptions, and invoices from Neon to Local...');

  // Connect to Neon using the default DATABASE_URL from process.env
  const neon = new PrismaNeon({
    datasources: {
      db: { url: process.env.DATABASE_URL }
    }
  });

  // Connect to Local Postgres
  const localUrl = 'postgresql://postgres:postgrespassword@localhost:5433/church_saas';
  const local = new PrismaLocal({
    datasources: {
      db: { url: localUrl }
    }
  });

  // 1. Sync plans
  const neonPlans = await neon.plan.findMany();
  console.log(`Fetched ${neonPlans.length} plans from Neon.`);
  for (const plan of neonPlans) {
    await local.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_members: plan.max_members,
        max_users: plan.max_users,
        max_storage_gb: plan.max_storage_gb,
        features: plan.features,
        is_active: plan.is_active,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
      create: {
        id: plan.id,
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_members: plan.max_members,
        max_users: plan.max_users,
        max_storage_gb: plan.max_storage_gb,
        features: plan.features,
        is_active: plan.is_active,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }
    });
  }
  console.log('Plans synced successfully.');

  // 2. Sync subscriptions
  const neonSubs = await neon.subscription.findMany();
  console.log(`Fetched ${neonSubs.length} subscriptions from Neon.`);
  for (const sub of neonSubs) {
    const tenantId = sub.tenantId === 'gpib-paulus' ? 'demo-church' : sub.tenantId;

    await local.subscription.upsert({
      where: { id: sub.id },
      update: {
        tenantId: tenantId,
        planId: sub.planId,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        trialEndsAt: sub.trialEndsAt,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        suspendedAt: sub.suspendedAt,
        pendingPlanId: sub.pendingPlanId,
        pendingPlanEffectiveAt: sub.pendingPlanEffectiveAt,
        cancelledAt: sub.cancelledAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      },
      create: {
        id: sub.id,
        tenantId: tenantId,
        planId: sub.planId,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        trialEndsAt: sub.trialEndsAt,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        suspendedAt: sub.suspendedAt,
        pendingPlanId: sub.pendingPlanId,
        pendingPlanEffectiveAt: sub.pendingPlanEffectiveAt,
        cancelledAt: sub.cancelledAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      }
    });
  }
  console.log('Subscriptions synced successfully.');

  // 3. Sync invoices
  const neonInvoices = await neon.invoice.findMany();
  console.log(`Fetched ${neonInvoices.length} invoices from Neon.`);
  for (const inv of neonInvoices) {
    const tenantId = inv.tenantId === 'gpib-paulus' ? 'demo-church' : inv.tenantId;

    await local.invoice.upsert({
      where: { id: inv.id },
      update: {
        tenantId: tenantId,
        subscriptionId: inv.subscriptionId,
        externalId: inv.externalId,
        amount: inv.amount,
        status: inv.status,
        invoiceUrl: inv.invoiceUrl,
        expiryDate: inv.expiryDate,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      },
      create: {
        id: inv.id,
        tenantId: tenantId,
        subscriptionId: inv.subscriptionId,
        externalId: inv.externalId,
        amount: inv.amount,
        status: inv.status,
        invoiceUrl: inv.invoiceUrl,
        expiryDate: inv.expiryDate,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      }
    });
  }
  console.log('Invoices synced successfully.');

  // Disconnect
  await neon.$disconnect();
  await local.$disconnect();
  console.log('Sync completed!');
}

run().catch(console.error);
