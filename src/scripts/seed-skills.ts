import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
    const skills = [
        { name: 'Singer', description: 'Vocalist for worship team' },
        { name: 'Guitarist', description: 'Acoustic or Electric guitar player' },
        { name: 'Pianist/Keyboardist', description: 'Piano or keyboard player' },
        { name: 'Drummer', description: 'Drums or percussion' },
        { name: 'Bassist', description: 'Bass guitar player' },
        { name: 'Sound Engineer', description: 'Operating mixer and audio systems' },
        { name: 'Multimedia/Projection', description: 'Operating EasyWorship/OBS/PPT' },
        { name: 'Sunday School Teacher', description: 'Teaching children' },
        { name: 'Usher/Greeter', description: 'Welcoming guests' },
        { name: 'Intercessor', description: 'Prayer warrior' },
    ];

    console.log('Seeding skills...');

    for (const skill of skills) {
        const existing = await prisma.skill.findFirst({
            where: { name: skill.name, tenantId: null }
        });
        if (!existing) {
            await prisma.skill.create({
                data: skill
            });
        }
    }

    console.log('Skills seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
