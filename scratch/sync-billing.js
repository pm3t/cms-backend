const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const neon = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

const local = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:postgrespassword@localhost:5433/church_saas' }
  }
});

async function run() {
  console.log('Syncing plans, subscriptions, and invoices from Neon to Local...');

  // 1. plans
  const neonPlans = await neon.plan.findMany();
  console.log(`Fetched ${neonPlans.length} plans.`);
  for (const plan of neonPlans) {
    await local.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan
    });
  }
  console.log('Plans synced.');

  // 2. subscriptions
  const neonSubs = await neon.subscription.findMany();
  console.log(`Fetched ${neonSubs.length} subscriptions.`);
  for (const sub of neonSubs) {
    sub.tenantId = sub.tenantId === 'gpib-paulus' ? 'demo-church' : sub.tenantId;
    await local.subscription.upsert({
      where: { id: sub.id },
      update: sub,
      create: sub
    });
  }
  console.log('Subscriptions synced.');

  // 3. invoices
  const neonInvoices = await neon.invoice.findMany();
  console.log(`Fetched ${neonInvoices.length} invoices.`);
  for (const inv of neonInvoices) {
    inv.tenantId = inv.tenantId === 'gpib-paulus' ? 'demo-church' : inv.tenantId;
    await local.invoice.upsert({
      where: { id: inv.id },
      update: inv,
      create: inv
    });
  }
  console.log('Invoices synced.');

  await neon.$disconnect();
  await local.$disconnect();
  console.log('Sync completed successfully!');
}

run().catch(console.error);
