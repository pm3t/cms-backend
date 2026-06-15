import { PrismaClient, MemberCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed for mobile activities...');

  // Get first tenant (excluding platform-admin if possible, otherwise use whatever is there)
  const tenant = await prisma.tenant.findFirst({
    where: {
      NOT: { id: 'platform-admin' }
    }
  }) || await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('No tenant found in the database. Please create a tenant first.');
    return;
  }

  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // Get active members for this tenant
  const members = await prisma.member.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' }
  });

  if (members.length === 0) {
    console.log('No active members found for this tenant. Seeding a few members first...');
    // Seed some mock members
    const mockMembersData = [
      { firstName: 'Remaja', lastName: 'Satu', category: MemberCategory.YOUTH },
      { firstName: 'Remaja', lastName: 'Dua', category: MemberCategory.YOUTH },
      { firstName: 'Remaja', lastName: 'Tiga', category: MemberCategory.YOUTH },
      { firstName: 'Dewasa', lastName: 'Satu', category: MemberCategory.ADULT },
      { firstName: 'Dewasa', lastName: 'Dua', category: MemberCategory.ADULT },
      { firstName: 'Dewasa', lastName: 'Tiga', category: MemberCategory.ADULT },
      { firstName: 'Lansia', lastName: 'Satu', category: MemberCategory.ELDERLY },
      { firstName: 'Lansia', lastName: 'Dua', category: MemberCategory.ELDERLY },
      { firstName: 'Anak', lastName: 'Satu', category: MemberCategory.CHILDREN }
    ];

    for (const mData of mockMembersData) {
      const created = await prisma.member.create({
        data: {
          tenantId: tenant.id,
          firstName: mData.firstName,
          lastName: mData.lastName,
          category: mData.category,
          gender: 'M',
          status: 'ACTIVE'
        }
      });
      members.push(created);
    }
  }

  console.log(`Active members: ${members.length}`);

  // Let's set password hashes for some members to make them "registered"
  // E.g. 80% of YOUTH, 60% of ADULT, 20% of ELDERLY
  const actions = ['LOGIN', 'OPEN_APP', 'REGISTER_EVENT', 'SUBMIT_PRAYER', 'RECORD_GIVING'];
  const devices = ['Android', 'iOS', 'WebMobile'];

  let registeredCount = 0;
  let logsCount = 0;

  for (const member of members) {
    const cat = member.category;
    let shouldRegister = false;

    if (cat === MemberCategory.YOUTH) shouldRegister = Math.random() < 0.85;
    else if (cat === MemberCategory.ADULT) shouldRegister = Math.random() < 0.65;
    else if (cat === MemberCategory.ELDERLY) shouldRegister = Math.random() < 0.25;
    else if (cat === MemberCategory.CHILDREN) shouldRegister = Math.random() < 0.15;

    if (shouldRegister) {
      await prisma.member.update({
        where: { id: member.id },
        data: { passwordHash: '$2b$10$mockPasswordHashForTestingAppEngagement' }
      });
      registeredCount++;

      // Create activity logs in the last 30 days
      const numLogs = Math.floor(Math.random() * 5) + 1; // 1 to 5 logs
      for (let i = 0; i < numLogs; i++) {
        // Random date in last 30 days
        const randomDaysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - randomDaysAgo);

        await prisma.memberActivityLog.create({
          data: {
            tenantId: tenant.id,
            memberId: member.id,
            action: actions[Math.floor(Math.random() * actions.length)],
            device: devices[Math.floor(Math.random() * devices.length)],
            createdAt
          }
        });
        logsCount++;
      }
    }
  }

  console.log(`Seeding complete!`);
  console.log(`- Set ${registeredCount} members as registered mobile users.`);
  console.log(`- Created ${logsCount} mock activity logs in the last 30 days.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
