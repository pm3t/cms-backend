const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding gpib-paulus tenant, admin user, and facilities...");

  // 1. Get Enterprise Plan
  const plan = await prisma.plan.findUnique({
    where: { name: 'Enterprise' }
  });

  if (!plan) {
    throw new Error('Enterprise plan not found in database. Please seed plans first.');
  }

  // 2. Upsert Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'gpib-paulus' },
    update: {},
    create: {
      id: 'gpib-paulus',
      name: 'GPIB Paulus',
      email: 'paulus@email.com',
    }
  });

  console.log(`Tenant created: ${tenant.name} (${tenant.id})`);

  // 3. Upsert Subscription (Enterprise, 3 months trialing)
  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const existingSub = await prisma.subscription.findFirst({
    where: { tenantId: 'gpib-paulus' }
  });

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        planId: plan.id,
        status: 'trialing',
        startDate: now,
        endDate: threeMonthsFromNow,
        trialEndsAt: threeMonthsFromNow,
      }
    });
    console.log("Updated existing subscription to Enterprise (trialing 3 months)");
  } else {
    await prisma.subscription.create({
      data: {
        tenantId: 'gpib-paulus',
        planId: plan.id,
        status: 'trialing',
        startDate: now,
        endDate: threeMonthsFromNow,
        trialEndsAt: threeMonthsFromNow,
      }
    });
    console.log("Created new subscription under Enterprise (trialing 3 months)");
  }

  // 4. Hash password '123456'
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 5. Upsert User (Admin user)
  const user = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'paulus@email.com',
        tenantId: 'gpib-paulus',
      }
    },
    update: {
      password: hashedPassword,
      name: 'Admin Paulus',
    },
    create: {
      email: 'paulus@email.com',
      password: hashedPassword,
      name: 'Admin Paulus',
      tenantId: 'gpib-paulus',
    }
  });

  console.log(`Admin user created/updated: ${user.email}`);

  // 6. Upsert Member (for mobile app login)
  const member = await prisma.member.findFirst({
    where: {
      email: 'paulus@email.com',
      tenantId: 'gpib-paulus',
    }
  });

  if (member) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        firstName: 'Paulus',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
      }
    });
    console.log(`Member updated: ${member.email}`);
  } else {
    const newMember = await prisma.member.create({
      data: {
        tenantId: 'gpib-paulus',
        firstName: 'Paulus',
        email: 'paulus@email.com',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
      }
    });
    console.log(`Member created: ${newMember.email} (${newMember.id})`);
  }

  // 7. Seed sample facilities/rooms for gpib-paulus
  const facilitiesData = [
    {
      name: 'Gedung Utama (Sanctuary)',
      type: 'SANCTUARY',
      capacity: 500,
      location: 'Gedung A Lantai 1 & 2',
      description: 'Gedung ibadah utama untuk kebaktian hari Minggu dan acara sakramen besar.',
      amenities: 'AC, Sound System, Proyektor, Organ, Kursi Jemaat',
    },
    {
      name: 'Ruang Serbaguna (Hall)',
      type: 'HALL',
      capacity: 150,
      location: 'Gedung B Lantai 1',
      description: 'Ruang serbaguna untuk kegiatan persekutuan, latihan paduan suara, dan acara ramah tamah.',
      amenities: 'Kipas Angin, Sound System, Meja Lipat, Kursi',
    },
    {
      name: 'Ruang Rapat Penatua (Meeting Room)',
      type: 'MEETING_ROOM',
      capacity: 30,
      location: 'Gedung B Lantai 2',
      description: 'Ruangan khusus rapat majelis jemaat, rapat komisi, dan konseling.',
      amenities: 'AC, Papan Tulis, Proyektor, Meja Rapat',
    }
  ];

  console.log("Seeding facilities/rooms...");
  for (const f of facilitiesData) {
    const existingFac = await prisma.facility.findFirst({
      where: {
        tenantId: 'gpib-paulus',
        name: f.name,
      }
    });

    if (existingFac) {
      await prisma.facility.update({
        where: { id: existingFac.id },
        data: {
          type: f.type,
          capacity: f.capacity,
          location: f.location,
          description: f.description,
          amenities: f.amenities,
        }
      });
      console.log(`Updated facility: ${f.name}`);
    } else {
      await prisma.facility.create({
        data: {
          tenantId: 'gpib-paulus',
          name: f.name,
          type: f.type,
          capacity: f.capacity,
          location: f.location,
          description: f.description,
          amenities: f.amenities,
        }
      });
      console.log(`Created facility: ${f.name}`);
    }
  }

  console.log("Seeding gpib-paulus completed successfully!");
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
