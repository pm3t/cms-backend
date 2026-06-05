const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const group = await prisma.smallGroup.create({
      data: {
        tenantId: 'some-tenant-id',
        name: 'Test Group',
        description: '',
        type: 'CELL_GROUP',
        meetingSchedule: '',
        location: ''
      }
    });
    console.log(group);
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
