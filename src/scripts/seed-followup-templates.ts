import { prisma } from '../prisma';

async function main() {
    const tenants = await prisma.tenant.findMany();
    if (tenants.length === 0) {
        console.log('No tenants found in database.');
        return;
    }

    const defaultTemplates = [
        {
            name: 'Follow-up: Sapaan Rindu Kehadiran (2-3 Minggu)',
            subject: 'Shalom {{name}}, Kami Merindukan Persekutuan Bersamamu! 🕊️',
            body: 'Shalom {{name}}, semoga minggu ini berjalan dengan penuh sukacita dan damai sejahtera dari Tuhan. Kami dari tim penggembalaan gereja ingin menyapa dan merindukan persekutuan bersama {{name}}. Jika ada hal yang bisa kami doakan atau dukung, jangan ragu untuk memberi tahu kami ya. Sampai jumpa di ibadah minggu ini! 🙏',
            channel: 'INBOX' as any
        },
        {
            name: 'Follow-up: Perhatian Pastoral & Pokok Doa (1+ Bulan)',
            subject: 'Salam & Perhatian Penggembalaan untuk {{name}} ❤️',
            body: 'Shalom {{name}}, kami memperhatikan {{name}} belum sempat hadir di persekutuan ibadah beberapa minggu terakhir. Kami berdoa agar {{name}} dan keluarga selalu dalam keadaan sehat dan dilindungi Tuhan. Apabila ada beban gumul, pergumulan kesehatan, atau pokok doa yang ingin didukung oleh tim pengerja gereja, kami selalu siap mendampingi. Tentukan waktu untuk mengobrol bersama kami ya. Tuhan memberkati!',
            channel: 'INBOX' as any
        },
        {
            name: 'Follow-up: Undangan Persekutuan Komsel',
            subject: 'Undangan Hangat Persekutuan Komsel untuk {{name}} 🤗',
            body: 'Halo {{name}}! Teman-teman di kelompok sel (komsel) rindu menyambut dan bersekutu kembali bersama {{name}}. Di komsel, kita bisa saling menguatkan, berdoa bersama, dan bertumbuh dalam iman. Mari bergabung dalam pertemuan minggu ini! Sampai ketemu ya {{name}}! 🙏',
            channel: 'INBOX' as any
        },
        {
            name: 'Follow-up: Perhatian Khusus (>2 Bulan Absen)',
            subject: 'Pintu Gereja Selalu Terbuka untuk {{name}} 🕊️',
            body: 'Shalom {{name}}, semoga kabar {{name}} dan keluarga baik dan sejahtera. Kami menyadari sudah cukup lama {{name}} belum bersekutu bersama kami di ibadah. Ketahuilah bahwa keluarga gereja selalu mengasihi dan merindukan keberadaan {{name}}. Pintu gereja dan tim pastoral selalu terbuka kapan pun {{name}} membutuhkan teman berbagi atau pelayanan doa. Salam kasih dalam Kristus.',
            channel: 'INBOX' as any
        }
    ];

    console.log(`Found ${tenants.length} tenant(s). Seeding follow-up templates...`);

    for (const tenant of tenants) {
        for (const tmpl of defaultTemplates) {
            const existing = await prisma.communicationTemplate.findFirst({
                where: {
                    tenantId: tenant.id,
                    name: tmpl.name
                }
            });

            if (existing) {
                console.log(`Template "${tmpl.name}" already exists for tenant: ${tenant.name}`);
                continue;
            }

            await prisma.communicationTemplate.create({
                data: {
                    ...tmpl,
                    tenantId: tenant.id
                }
            });
            console.log(`Created template "${tmpl.name}" for tenant: ${tenant.name}`);
        }
    }
}

main()
    .catch(err => {
        console.error('Error seeding follow-up templates:', err);
    })
    .finally(() => {
        prisma.$disconnect();
    });
