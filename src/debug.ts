import { prisma } from './prisma';

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log('--- All Users and Roles ---');
  console.log(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    tenantId: u.tenantId,
    role: u.role ? u.role.name : null,
    isSuperAdmin: u.isSuperAdmin
  })));

  const members = await prisma.member.findMany({
    take: 5
  });
  console.log('--- Sample Members ---');
  console.log(members.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    tenantId: m.tenantId
  })));
}

main().catch(console.error);
