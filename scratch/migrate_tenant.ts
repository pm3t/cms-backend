import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const oldId = 'gpib-paulus';
  const newId = 'demo-church';
  const newName = 'Demo Church';

  console.log(`Starting migration from ${oldId} to ${newId}...`);

  // 1. Get old tenant details
  const oldTenant = await prisma.tenant.findUnique({
    where: { id: oldId }
  });

  if (!oldTenant) {
    console.log(`Tenant ${oldId} not found!`);
    return;
  }

  // 2. Create/update the new tenant
  const existing = await prisma.tenant.findUnique({ where: { id: newId } });
  if (existing) {
    await prisma.tenant.update({
      where: { id: newId },
      data: {
        name: newName,
        email: oldTenant.email,
        phone: oldTenant.phone,
        address: oldTenant.address,
        logoUrl: oldTenant.logoUrl,
        domain: oldTenant.domain,
        timezone: oldTenant.timezone,
        currency: oldTenant.currency,
        language: oldTenant.language,
        primaryColor: oldTenant.primaryColor,
        planId: oldTenant.planId,
      }
    });
    console.log(`Updated existing new tenant: ${newId}`);
  } else {
    await prisma.tenant.create({
      data: {
        id: newId,
        name: newName,
        email: oldTenant.email,
        phone: oldTenant.phone,
        address: oldTenant.address,
        logoUrl: oldTenant.logoUrl,
        domain: oldTenant.domain,
        timezone: oldTenant.timezone,
        currency: oldTenant.currency,
        language: oldTenant.language,
        primaryColor: oldTenant.primaryColor,
        planId: oldTenant.planId,
      }
    });
    console.log(`Created new tenant: ${newId}`);
  }

  // 3. Find all tables with column 'tenantId'
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenantId' AND table_schema = 'public';
  `);

  console.log(`Found ${tables.length} tables to update.`);

  // 4. Update referencing rows in all tables
  for (const t of tables) {
    const tableName = t.table_name;
    // Skip the Tenant table itself
    if (tableName === 'Tenant') continue;

    console.log(`Updating table: "${tableName}"...`);
    try {
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "${tableName}"
        SET "tenantId" = $1
        WHERE "tenantId" = $2
      `, newId, oldId);
      console.log(`Updated ${result} rows in "${tableName}"`);
    } catch (err: any) {
      console.error(`Error updating table "${tableName}":`, err.message);
    }
  }

  // 5. Delete old tenant
  try {
    await prisma.tenant.delete({
      where: { id: oldId }
    });
    console.log(`Deleted old tenant: ${oldId}`);
  } catch (err: any) {
    console.error(`Error deleting old tenant:`, err.message);
  }

  console.log('Migration completed successfully!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
