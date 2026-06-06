import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const globalSkills = [
  { name: 'Singer', description: 'Vocalist for praise and worship team' },
  { name: 'Guitarist', description: 'Acoustic or electric guitar player for the band' },
  { name: 'Keyboardist', description: 'Piano or synthesizer player' },
  { name: 'Bassist', description: 'Bass guitar player' },
  { name: 'Drummer', description: 'Drums or percussion player' },
  { name: 'Sound Engineer', description: 'Controls audio mixer and sound system' },
  { name: 'Multimedia Operator', description: 'Manages presentation slides and screen visuals' },
  { name: 'Usher', description: 'Welcomes congregation members and helps with seating' },
  { name: 'Sunday School Teacher', description: 'Teaches children in Sunday School' },
  { name: 'Preacher / Speaker', description: 'Delivers sermons or speaks at events' },
  { name: 'Intercessor', description: 'Participates in prayer ministry and intercession' },
  { name: 'Counselor', description: 'Provides spiritual counseling and guidance' },
  { name: 'Photographer / Videographer', description: 'Captures photos or videos of services and events' },
  { name: 'IT Support', description: 'Assists with network, website, and technical setups' },
  { name: 'Translator', description: 'Translates sermons or text to other languages' }
];

async function main() {
  console.log('Starting seed for global skills...');
  for (const skill of globalSkills) {
    const existing = await prisma.skill.findFirst({
      where: {
        name: skill.name,
        tenantId: null
      }
    });

    if (existing) {
      await prisma.skill.update({
        where: { id: existing.id },
        data: { description: skill.description }
      });
      console.log(`Updated global skill: ${skill.name}`);
    } else {
      await prisma.skill.create({
        data: {
          name: skill.name,
          description: skill.description,
          tenantId: null
        }
      });
      console.log(`Created global skill: ${skill.name}`);
    }
  }
  console.log('Seed skills completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding skills:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
