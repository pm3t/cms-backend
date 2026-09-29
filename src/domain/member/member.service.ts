import { prisma } from '../../prisma';
import { z } from 'zod';
import { MembershipStatus, MemberCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

export const createFamilySchema = z.object({
    name: z.string().min(2),
    headOfFamilyId: z.string().optional()
});

export interface AgeGroupRule {
    category: MemberCategory;
    minAge: number;
    maxAge: number;
    label: string;
}

export const DEFAULT_AGE_RULES: AgeGroupRule[] = [
    { category: MemberCategory.CHILDREN, minAge: 0, maxAge: 12, label: 'Anak' },
    { category: MemberCategory.YOUTH, minAge: 13, maxAge: 20, label: 'Remaja/Youth' },
    { category: MemberCategory.ADULT, minAge: 21, maxAge: 59, label: 'Dewasa' },
    { category: MemberCategory.ELDERLY, minAge: 60, maxAge: 150, label: 'Lansia' }
];

export async function getMemberCategory(tenantId: string, birthDate: Date | string | null | undefined, manualCategory?: MemberCategory): Promise<MemberCategory> {
    if (!birthDate) return manualCategory || MemberCategory.ADULT;
    
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    if (isNaN(date.getTime())) return manualCategory || MemberCategory.ADULT;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { ageGroupRules: true }
    });

    let rules: AgeGroupRule[] = DEFAULT_AGE_RULES;
    if (tenant?.ageGroupRules && Array.isArray(tenant.ageGroupRules)) {
        rules = tenant.ageGroupRules as unknown as AgeGroupRule[];
    }

    const matched = rules.find(r => age >= r.minAge && age <= r.maxAge);
    return matched ? matched.category : (manualCategory || MemberCategory.ADULT);
}

export const createMemberSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().nullable(),
    gender: z.string().length(1).optional().nullable(),
    birthDate: z.string().datetime().optional().nullable(),
    email: z.union([z.literal(''), z.string().email()]).optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    rayon: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    referenceNumber: z.string().optional().nullable(),
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
        
        const finalEmail = parsed.email || null;
        const finalReference = parsed.referenceNumber || null;

        if (finalEmail) {
            const existingEmail = await prisma.member.findFirst({
                where: { tenantId, email: finalEmail }
            });
            if (existingEmail) throw new Error('Data jemaat dengan email ini sudah terdaftar');
        }
        
        if (finalReference) {
            const existingRef = await prisma.member.findFirst({
                where: { tenantId, referenceNumber: finalReference }
            });
            if (existingRef) throw new Error('Data jemaat dengan Nomor Induk ini sudah terdaftar');
        }

        const category = await getMemberCategory(tenantId, parsed.birthDate, parsed.category);
        return prisma.member.create({
            data: {
                ...parsed,
                email: finalEmail,
                referenceNumber: finalReference,
                category,
                tenantId
            }
        });
    }

    async updateMember(tenantId: string, memberId: string, data: any) {
        // ensure belongs to tenant
        const currentMember = await this.getMember(tenantId, memberId);

        // Use a partial schema so we don't throw 400 when missing unrelated required fields like firstName
        const parsed = createMemberSchema.partial().parse(data);

        const finalEmail = parsed.email !== undefined ? (parsed.email || null) : currentMember.email;
        const finalReference = parsed.referenceNumber !== undefined ? (parsed.referenceNumber || null) : currentMember.referenceNumber;

        if (finalEmail && finalEmail !== currentMember.email) {
            const existingEmail = await prisma.member.findFirst({
                where: { tenantId, email: finalEmail }
            });
            if (existingEmail) throw new Error('Data jemaat dengan email ini sudah terdaftar');
        }

        if (finalReference && finalReference !== currentMember.referenceNumber) {
            const existingRef = await prisma.member.findFirst({
                where: { tenantId, referenceNumber: finalReference }
            });
            if (existingRef) throw new Error('Data jemaat dengan Nomor Induk ini sudah terdaftar');
        }

        let category = parsed.category;
        if (parsed.birthDate !== undefined) {
            category = await getMemberCategory(tenantId, parsed.birthDate, parsed.category || currentMember.category);
        } else if (currentMember.birthDate) {
            category = await getMemberCategory(tenantId, currentMember.birthDate, parsed.category || currentMember.category);
        }

        return prisma.member.update({
            where: { id: memberId },
            data: {
                ...parsed,
                email: finalEmail,
                referenceNumber: finalReference,
                ...(category ? { category } : {})
            }
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
            const referenceNumber = raw.referenceNumber || raw.reference_number || raw.referenceNo || raw.reference_no || raw.noInduk || raw.no_induk || null;

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
            const initialCat = catMap[rawCat] || 'ADULT';

            // Parse birthDate safely
            let birthDate: Date | null = null;
            const rawBirthDate = raw.birthDate || raw.birthdate;
            if (rawBirthDate) {
                const parsedDate = new Date(rawBirthDate);
                if (!isNaN(parsedDate.getTime())) {
                    birthDate = parsedDate;
                }
            }

            const finalCat = await getMemberCategory(tenantId, birthDate, initialCat);
            const address = raw.address || null;

            try {
                let existingMember = null;
                if (email) {
                    existingMember = await prisma.member.findFirst({ where: { tenantId, email } });
                }
                if (!existingMember && referenceNumber) {
                    existingMember = await prisma.member.findFirst({ where: { tenantId, referenceNumber } });
                }

                if (existingMember) {
                    await prisma.member.update({
                        where: { id: existingMember.id },
                        data: {
                            firstName: raw.firstName || existingMember.firstName,
                            lastName: raw.lastName || existingMember.lastName,
                            gender: gender || existingMember.gender,
                            phone: phone || existingMember.phone,
                            birthDate: birthDate || existingMember.birthDate,
                            address: address || existingMember.address,
                            category: finalCat,
                            status: finalStatus
                        }
                    });
                } else {
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
                            referenceNumber,
                            category: finalCat,
                            status: finalStatus
                        }
                    });
                }
                count++;
            } catch (error) {
                console.error('Skipping row due to error:', error);
            }
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

    async getCongregationMapData(tenantId: string, queryFilters: any = {}) {
        const { search, category, status, rayon, groupId, hasCoordinates } = queryFilters;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, address: true, latitude: true, longitude: true }
        });

        const whereClause: any = { tenantId };

        if (search) {
            whereClause.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { rayon: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) {
            whereClause.category = category;
        }

        if (status) {
            whereClause.status = status;
        }

        if (rayon) {
            whereClause.rayon = rayon;
        }

        if (groupId) {
            whereClause.smallGroupMemberships = {
                some: { groupId }
            };
        }

        if (hasCoordinates === 'true') {
            whereClause.latitude = { not: null };
            whereClause.longitude = { not: null };
        } else if (hasCoordinates === 'false') {
            whereClause.OR = [
                { latitude: null },
                { longitude: null }
            ];
        }

        const members = await prisma.member.findMany({
            where: whereClause,
            include: {
                family: { select: { id: true, name: true } },
                smallGroupMemberships: {
                    include: { group: { select: { id: true, name: true } } }
                }
            },
            orderBy: { firstName: 'asc' }
        });

        const totalMembers = members.length;
        const mappedMembers = members.filter(m => m.latitude !== null && m.longitude !== null);
        const mappedMembersCount = mappedMembers.length;
        const unmappedMembersCount = totalMembers - mappedMembersCount;

        const byRayon: Record<string, number> = {};
        const byCategory: Record<string, number> = {};

        members.forEach(m => {
            const r = m.rayon || 'Belum Ditentukan';
            byRayon[r] = (byRayon[r] || 0) + 1;

            const c = m.category || 'ADULT';
            byCategory[c] = (byCategory[c] || 0) + 1;
        });

        return {
            tenantHQ: tenant,
            metrics: {
                totalMembers,
                mappedMembersCount,
                unmappedMembersCount,
                mappedPercentage: totalMembers > 0 ? Math.round((mappedMembersCount / totalMembers) * 100) : 0,
                byRayon,
                byCategory
            },
            members
        };
    }

    async updateMemberLocation(tenantId: string, memberId: string, data: any) {
        await this.getMember(tenantId, memberId);
        const { latitude, longitude, address, district, city, postalCode, rayon } = data;

        return prisma.member.update({
            where: { id: memberId },
            data: {
                latitude: latitude !== undefined ? latitude : undefined,
                longitude: longitude !== undefined ? longitude : undefined,
                address: address !== undefined ? address : undefined,
                district: district !== undefined ? district : undefined,
                city: city !== undefined ? city : undefined,
                postalCode: postalCode !== undefined ? postalCode : undefined,
                rayon: rayon !== undefined ? rayon : undefined,
            }
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
