import { prisma } from '../src/prisma';

async function main() {
    console.log('Starting script to clone "Birthday Greeting Template" to all tenants...');

    // 1. Find an existing template to use as source
    const sourceTemplate = await prisma.communicationTemplate.findFirst({
        where: {
            name: {
                equals: 'Birthday Greeting Template',
                mode: 'insensitive'
            }
        }
    });

    let subject = '🎂 Selamat Hari Ulang Tahun, {{name}}! 🎉';
    let body = `Shalom {{name}},

Segenap keluarga besar gereja mengucapkan Selamat Hari Ulang Tahun. Kiranya damai sejahtera, kesehatan, dan berkat Tuhan melimpah senantiasa dalam kehidupan Anda!

"Tuhan memberkati engkau dan melindungi engkau; Tuhan menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia." — Bilangan 6:24-25

Tuhan Yesus memberkati!`;

    if (sourceTemplate) {
        console.log(`Found source template from tenant ${sourceTemplate.tenantId}:`);
        console.log(`Subject: ${sourceTemplate.subject}`);
        subject = sourceTemplate.subject;
        body = sourceTemplate.body;
    } else {
        console.log('No existing "Birthday Greeting Template" found. Using default template values.');
    }

    // 2. Fetch all tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants in database.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const tenant of tenants) {
        // Check if tenant already has a template with this name
        const existing = await prisma.communicationTemplate.findFirst({
            where: {
                tenantId: tenant.id,
                name: {
                    equals: 'Birthday Greeting Template',
                    mode: 'insensitive'
                }
            }
        });

        if (existing) {
            console.log(`Tenant: "${tenant.name}" (${tenant.id}) already has this template. Skipping...`);
            skippedCount++;
            continue;
        }

        // Create the template for the tenant
        await prisma.communicationTemplate.create({
            data: {
                name: 'Birthday Greeting Template',
                subject,
                body,
                channel: 'INBOX',
                tenantId: tenant.id
            }
        });

        console.log(`Created "Birthday Greeting Template" for tenant: "${tenant.name}" (${tenant.id})`);
        createdCount++;
    }

    console.log(`\nClone job finished.`);
    console.log(`Total tenants: ${tenants.length}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

main()
    .catch(err => {
        console.error('Error executing script:', err);
    })
    .finally(() => {
        prisma.$disconnect();
    });
