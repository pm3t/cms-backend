import { prisma } from '../../prisma';
import { z } from 'zod';
import { MembershipStatus, MemberCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

export const createFamilySchema = z.object({
    name: z.string().min(2),
    headOfFamilyId: z.string().optional()
});

export const createMemberSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    gender: z.string().length(1).optional(),
    birthDate: z.string().datetime().optional().nullable(),
    email: z.union([z.literal(''), z.string().email()]).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    status: z.nativeEnum(MembershipStatus).optional(),
    category: z.nativeEnum(MemberCategory).optional(),
    isPrivate: z.boolean().optional(),
    familyId: z.string().nullable().optional()
});

export class MemberService {
    async listMembers(tenantId: string) {
        return prisma.member.findMany({
            where: { tenantId },
            include: {
                family: true,
                sacraments: true
            },
            orderBy: { firstName: 'asc' }
        });
    }

    async getMember(tenantId: string, memberId: string) {
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            include: { 
                family: true, 
                sacraments: true,
                skills: { include: { skill: true } }
            }
        });
        if (!member || member.tenantId !== tenantId) throw new Error('Member not found');
        return member;
    }

    async createMember(tenantId: string, data: any) {
        const parsed = createMemberSchema.parse(data);
        return prisma.member.create({
            data: {
                ...parsed,
                tenantId
            }
        });
    }

    async updateMember(tenantId: string, memberId: string, data: any) {
        // ensure belongs to tenant
        await this.getMember(tenantId, memberId);

        // Use a partial schema so we don't throw 400 when missing unrelated required fields like firstName
        const parsed = createMemberSchema.partial().parse(data);
        return prisma.member.update({
            where: { id: memberId },
            data: parsed
        });
    }

    async deleteMember(tenantId: string, memberId: string) {
        await this.getMember(tenantId, memberId);
        return prisma.member.delete({
            where: { id: memberId }
        });
    }

    async bulkDeleteMembers(tenantId: string, ids: string[]) {
        const result = await prisma.member.deleteMany({
            where: { id: { in: ids }, tenantId }
        });
        return { deleted: result.count };
    }

    async importMembers(tenantId: string, membersData: any[]) {
        let count = 0;
        for (const raw of membersData) {
            // Safe guards
            if (!raw.firstName && !raw.email) continue; // Skip totally empty rows

            const gender = raw.gender?.toUpperCase().startsWith('F') || raw.gender?.toUpperCase() === 'P' ? 'F' : 'M';
            const email = raw.email || null;
            const phone = raw.phone || null;

            // Map Status enum
            const rawStatus = raw.status?.toUpperCase() || '';
            const statusMap: Record<string, MembershipStatus> = {
                'ACTIVE': 'ACTIVE', 'AKTIF': 'ACTIVE',
                'INACTIVE': 'INACTIVE', 'PASIF': 'INACTIVE',
                'CANDIDATE': 'CANDIDATE', 'CALON': 'CANDIDATE',
                'GUEST': 'GUEST', 'TAMU': 'GUEST'
            };
            const finalStatus = statusMap[rawStatus] || 'ACTIVE';

            // Map Category enum
            const rawCat = raw.category?.toUpperCase() || '';
            const catMap: Record<string, MemberCategory> = {
                'CHILDREN': 'CHILDREN', 'ANAK': 'CHILDREN', 'SUNDAY SCHOOL': 'CHILDREN',
                'YOUTH': 'YOUTH', 'REMAJA': 'YOUTH', 'PEMUDA': 'YOUTH',
                'ADULT': 'ADULT', 'DEWASA': 'ADULT', 'UMUM': 'ADULT',
                'ELDERLY': 'ELDERLY', 'LANSIA': 'ELDERLY'
            };
            const finalCat = catMap[rawCat] || 'ADULT';

            // Parse birthDate safely
            let birthDate: Date | null = null;
            const rawBirthDate = raw.birthDate || raw.birthdate;
            if (rawBirthDate) {
                const parsedDate = new Date(rawBirthDate);
                if (!isNaN(parsedDate.getTime())) {
                    birthDate = parsedDate;
                }
            }

            const address = raw.address || null;

            await prisma.member.create({
                data: {
                    tenantId,
                    firstName: raw.firstName || 'Unknown',
                    lastName: raw.lastName || '',
                    gender,
                    email,
                    phone,
                    birthDate,
                    address,
                    category: finalCat,
                    status: finalStatus
                }
            });
            count++;
        }
        return { imported: count };
    }

    async resetMobilePassword(tenantId: string, memberId: string, data: any) {
        const { password } = data;
        if (!password || password.length < 6) {
            throw new Error('Password baru minimal 6 karakter');
        }

        await this.getMember(tenantId, memberId);

        const passwordHash = await bcrypt.hash(password, 10);
        return prisma.member.update({
            where: { id: memberId },
            data: { passwordHash }
        });
    }
}

export class FamilyService {
    async listFamilies(tenantId: string) {
        return prisma.family.findMany({
            where: { tenantId },
            include: {
                headOfFamily: true,
                members: true
            }
        });
    }

    async createFamily(tenantId: string, data: any) {
        const parsed = createFamilySchema.parse(data);
        return prisma.family.create({
            data: {
                ...parsed,
                tenantId
            }
        });
    }

    async updateFamily(tenantId: string, familyId: string, data: any) {
        return prisma.family.update({
            where: { id: familyId, tenantId },
            data: {
                name: data.name,
                headOfFamilyId: data.headOfFamilyId || null
            }
        });
    }
}

export class SacramentService {
    async addSacrament(tenantId: string, memberId: string, data: any) {
        // verify member belongs to tenant
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member || member.tenantId !== tenantId) throw new Error('Member not found');

        return prisma.sacramentRecord.create({
            data: {
                memberId: member.id,
                type: data.type,
                date: new Date(data.date),
                location: data.location || null,
                pastorName: data.pastorName || null
            }
        });
    }

    async deleteSacrament(tenantId: string, sacramentId: string) {
        const record = await prisma.sacramentRecord.findUnique({
            where: { id: sacramentId },
            include: { member: true }
        });
        if (!record || record.member.tenantId !== tenantId) throw new Error('Record not found or unauthorized');

        return prisma.sacramentRecord.delete({ where: { id: sacramentId } });
    }
}
