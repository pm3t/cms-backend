import { prisma } from '../prisma';

async function main() {
    const tenants = await prisma.tenant.findMany();
    if (tenants.length === 0) {
        console.log('No tenants found in database.');
        return;
    }

    const templateData = {
        name: 'Happy Sunday Greeting',
        subject: 'Selamat Hari Minggu, {{name}}! 🌟',
        body: `Shalom {{name}},

Segenap gembala dan pelayan jemaat mengucapkan:
Selamat Hari Minggu! Kiranya damai sejahtera Kristus senantiasa menyertai Anda dan seluruh keluarga dalam minggu yang baru ini.

"Tuhan memberkati engkau dan melindungi engkau; Tuhan menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; Tuhan menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera." — Bilangan 6:24-26

Sampai jumpa di ibadah raya hari ini! Mari kita bersama-sama datang ke hadirat-Nya dengan ucapan syukur, memuji, dan memuliakan nama-Nya yang kudus.

Salam kasih & doa,
Gereja Eklesia`,
        channel: 'INBOX' as any
    };

    console.log(`Found ${tenants.length} tenant(s). Seeding "Happy Sunday" template...`);

    for (const tenant of tenants) {
        // Check if template already exists
        const existing = await prisma.communicationTemplate.findFirst({
            where: {
                tenantId: tenant.id,
                name: templateData.name
            }
        });

        if (existing) {
            console.log(`Template already exists for tenant: ${tenant.name} (${tenant.id})`);
            continue;
        }

        await prisma.communicationTemplate.create({
            data: {
                ...templateData,
                tenantId: tenant.id
            }
        });
        console.log(`Created template for tenant: ${tenant.name}`);
    }
}

main()
    .catch(err => {
        console.error('Error seeding template:', err);
    })
    .finally(() => {
        prisma.$disconnect();
    });
