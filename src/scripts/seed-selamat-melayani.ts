import { prisma } from '../prisma';

async function main() {
    const tenants = await prisma.tenant.findMany();
    if (tenants.length === 0) {
        console.log('No tenants found in database.');
        return;
    }

    const templateData = {
        name: 'Selamat Melayani Greeting',
        subject: 'Selamat Melayani di Rumah Tuhan, {{name}}! 🤝',
        body: `Shalom {{name}},

Segenap keluarga besar Gereja Eklesia mengucapkan terima kasih yang sebesar-besarnya atas komitmen, dedikasi, dan waktu yang telah Anda berikan untuk melayani pekerjaan Tuhan minggu ini.

"Sebab Allah bukan tidak adil, sehingga Ia lupa akan pekerjaanmu dan kasihmu yang telah kamu tunjukkan terhadap nama-Nya oleh pelayananmu kepada orang-orang kudus..." — Ibrani 6:10

Kiranya sukacita dan penyertaan Roh Kudus senantiasa menyertai dan menguatkan Anda dalam setiap tugas pelayanan yang dipercayakan. Lakukanlah segala sesuatu dengan segenap hati seperti untuk Tuhan dan bukan untuk manusia.

Selamat melayani, Tuhan Yesus memberkati pelayanan dan seluruh keluarga Anda!

Salam kasih & doa,
Gereja Eklesia`,
        channel: 'INBOX' as any
    };

    console.log(`Found ${tenants.length} tenant(s). Seeding "Selamat Melayani" template...`);

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
