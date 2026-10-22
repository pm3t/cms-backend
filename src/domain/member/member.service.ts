import { prisma } from '../../prisma';
import { z } from 'zod';
import { MembershipStatus, MemberCategory } from '@prisma/client';
import bcrypt from 'bcrypt';
import { canonicalPhone, getPhoneLookupVariants } from '../../lib/phone';

const safeDate = z.preprocess((arg) => {
    if (!arg || arg === '') return null;
    if (typeof arg === 'string' || arg instanceof Date) {
        const d = new Date(arg);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}, z.date().nullable().optional());

export const createFamilySchema = z.object({
    name: z.string().min(1, 'Nama keluarga harus diisi'),
    kkjNumber: z.string().optional().nullable(),
    headOfFamilyId: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    rtRw: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    rayon: z.string().optional().nullable(),
    branch: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    maritalStatus: z.string().optional().nullable(),
    marriageDate: safeDate,
    processDate: safeDate,
    pastorName: z.string().optional().nullable(),
    citySign: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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

export function parseBirthDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const s = String(val).trim();
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
        const day = parseInt(ddmmyyyy[1], 10);
        const month = parseInt(ddmmyyyy[2], 10) - 1;
        const year = parseInt(ddmmyyyy[3], 10);
        const d = new Date(Date.UTC(year, month, day));
        return isNaN(d.getTime()) ? null : d;
    }
    const yyyymmdd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
        const year = parseInt(yyyymmdd[1], 10);
        const month = parseInt(yyyymmdd[2], 10) - 1;
        const day = parseInt(yyyymmdd[3], 10);
        const d = new Date(Date.UTC(year, month, day));
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

export function formatDDMMYYYY(val: any, fallbackDate?: Date | null): string | null {
    if (val) {
        if (typeof val === 'number') {
            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
            return String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0') + d.getUTCFullYear();
        }
        const s = String(val).trim();
        const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
            return String(ddmmyyyy[1]).padStart(2, '0') + String(ddmmyyyy[2]).padStart(2, '0') + ddmmyyyy[3];
        }
        const yyyymmdd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (yyyymmdd) {
            return String(yyyymmdd[3]).padStart(2, '0') + String(yyyymmdd[2]).padStart(2, '0') + yyyymmdd[1];
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0') + d.getUTCFullYear();
        }
    }
    if (fallbackDate && fallbackDate instanceof Date && !isNaN(fallbackDate.getTime())) {
        return String(fallbackDate.getUTCDate()).padStart(2, '0') + String(fallbackDate.getUTCMonth() + 1).padStart(2, '0') + fallbackDate.getUTCFullYear();
    }
    return null;
}

export const createMemberSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    birthDate: safeDate,
    birthPlace: z.string().optional().nullable(),
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
    familyId: z.string().nullable().optional(),
    familyRole: z.string().nullable().optional(),
    familyRelation: z.string().nullable().optional(),
    education: z.string().nullable().optional(),
    occupation: z.string().nullable().optional(),
    isBaptized: z.boolean().optional(),
    baptizedDate: safeDate,
    isChildDedicated: z.boolean().optional(),
    childDedicatedDate: safeDate,
    isMarried: z.boolean().optional(),
    marriageDate: safeDate
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
        const finalPhone = parsed.phone ? canonicalPhone(parsed.phone) : null;
        const phoneVariants = parsed.phone ? getPhoneLookupVariants(parsed.phone) : [];

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

        if (phoneVariants.length > 0) {
            const existingPhone = await prisma.member.findFirst({
                where: { tenantId, phone: { in: phoneVariants } }
            });
            if (existingPhone) {
                throw new Error(
                    `Data jemaat dengan nomor HP ${parsed.phone} sudah terdaftar atas nama ${existingPhone.firstName} ${existingPhone.lastName || ''}`.trim()
                );
            }
        }

        const category = await getMemberCategory(tenantId, parsed.birthDate, parsed.category);

        let defaultPasswordHash: string | undefined = undefined;
        if (parsed.birthDate) {
            const pwd = formatDDMMYYYY(null, parsed.birthDate);
            if (pwd) {
                defaultPasswordHash = await bcrypt.hash(pwd, 10);
            }
        }

        return prisma.member.create({
            data: {
                ...parsed,
                email: finalEmail,
                phone: finalPhone || parsed.phone || null,
                referenceNumber: finalReference,
                category,
                tenantId,
                ...(defaultPasswordHash ? { passwordHash: defaultPasswordHash } : {})
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
        const finalPhone = parsed.phone !== undefined ? (parsed.phone ? canonicalPhone(parsed.phone) : null) : currentMember.phone;

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

        if (parsed.phone && parsed.phone !== currentMember.phone) {
            const phoneVariants = getPhoneLookupVariants(parsed.phone);
            if (phoneVariants.length > 0) {
                const existingPhone = await prisma.member.findFirst({
                    where: { tenantId, phone: { in: phoneVariants }, id: { not: memberId } }
                });
                if (existingPhone) {
                    throw new Error(
                        `Data jemaat dengan nomor HP ${parsed.phone} sudah digunakan oleh jemaat lain (${existingPhone.firstName} ${existingPhone.lastName || ''})`.trim()
                    );
                }
            }
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
                phone: finalPhone || parsed.phone || null,
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

            // Parse birthDate safely (supports DD/MM/YYYY, YYYY-MM-DD, Excel serial date, etc.)
            const rawBirthDate = raw.birthDate || raw.birthdate || raw.birth_date || raw.tglLahir || raw.tgl_lahir || raw.tanggalLahir || raw.tanggal_lahir;
            const birthDate = parseBirthDate(rawBirthDate);

            // Generate default password as ddmmyyyy of birthDate, or fallback to '123456'
            const defaultPassword = formatDDMMYYYY(rawBirthDate, birthDate) || '123456';
            const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);

            const finalCat = await getMemberCategory(tenantId, birthDate, initialCat);
            const address = raw.address || null;

            const rawPhone = phone ? phone.toString().trim() : null;
            const normalizedPhone = rawPhone ? canonicalPhone(rawPhone) : null;
            const phoneVariants = rawPhone ? getPhoneLookupVariants(rawPhone) : [];

            try {
                let existingMember = null;

                // Priority 1: Match by Email
                if (email) {
                    existingMember = await prisma.member.findFirst({
                        where: { tenantId, email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } }
                    });
                }

                // Priority 2: Match by Reference Number / Nomor Induk
                if (!existingMember && referenceNumber) {
                    existingMember = await prisma.member.findFirst({
                        where: { tenantId, referenceNumber: referenceNumber.trim() }
                    });
                }

                // Priority 3: Match by Phone (checks variants e.g. 08..., +62..., 62...)
                if (!existingMember && phoneVariants.length > 0) {
                    existingMember = await prisma.member.findFirst({
                        where: { tenantId, phone: { in: phoneVariants } }
                    });
                }

                // Priority 4: Match by Full Name + Birth Date
                if (!existingMember && raw.firstName && birthDate) {
                    existingMember = await prisma.member.findFirst({
                        where: {
                            tenantId,
                            firstName: { equals: raw.firstName.trim(), mode: 'insensitive' },
                            birthDate: birthDate,
                        }
                    });
                }

                if (existingMember) {
                    // Update existing member record without overwriting good data with blanks
                    await prisma.member.update({
                        where: { id: existingMember.id },
                        data: {
                            firstName: raw.firstName?.trim() || existingMember.firstName,
                            lastName: raw.lastName !== undefined ? raw.lastName?.trim() : existingMember.lastName,
                            gender: gender || existingMember.gender,
                            phone: normalizedPhone || existingMember.phone,
                            birthDate: birthDate || existingMember.birthDate,
                            address: address || existingMember.address,
                            referenceNumber: referenceNumber || existingMember.referenceNumber,
                            category: finalCat,
                            status: finalStatus,
                            // Set default password if the existing member doesn't have one yet
                            ...(existingMember.passwordHash ? {} : { passwordHash: defaultPasswordHash })
                        }
                    });
                } else {
                    // Create new member with default password from birthdate (ddmmyyyy)
                    await prisma.member.create({
                        data: {
                            tenantId,
                            firstName: raw.firstName?.trim() || 'Unknown',
                            lastName: raw.lastName?.trim() || '',
                            gender,
                            email: email ? email.trim().toLowerCase() : null,
                            phone: normalizedPhone || rawPhone || null,
                            birthDate,
                            address,
                            referenceNumber: referenceNumber?.trim() || null,
                            category: finalCat,
                            status: finalStatus,
                            passwordHash: defaultPasswordHash,
                            isImported: true,
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
    async generateKkjNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const count = await prisma.family.count({ where: { tenantId } });
        const seq = String(count + 1).padStart(4, '0');
        return `KKJ-${year}-${seq}`;
    }

    async listFamilies(tenantId: string, search?: string) {
        const where: any = { tenantId };
        if (search && search.trim() !== '') {
            const q = search.trim();
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { kkjNumber: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
                { rayon: { contains: q, mode: 'insensitive' } },
                { branch: { contains: q, mode: 'insensitive' } },
                { headOfFamily: { firstName: { contains: q, mode: 'insensitive' } } },
                { headOfFamily: { lastName: { contains: q, mode: 'insensitive' } } }
            ];
        }

        const families = await prisma.family.findMany({
            where,
            include: {
                headOfFamily: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        photoUrl: true,
                        phone: true,
                        email: true
                    }
                },
                members: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                        category: true,
                        familyRole: true,
                        familyRelation: true,
                        photoUrl: true
                    }
                },
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return families;
    }

    async getFamilyById(tenantId: string, familyId: string) {
        const family = await prisma.family.findUnique({
            where: { id: familyId },
            include: {
                headOfFamily: true,
                members: {
                    include: {
                        sacraments: true
                    }
                },
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        address: true,
                        phone: true,
                        email: true
                    }
                }
            }
        });

        if (!family || family.tenantId !== tenantId) {
            throw new Error('Data keluarga tidak ditemukan');
        }

        // Sort members: HEAD first, then SPOUSE, then CHILD, then OTHER
        const roleOrder: Record<string, number> = {
            'HEAD': 1,
            'SPOUSE': 2,
            'CHILD': 3,
            'OTHER': 4
        };

        family.members.sort((a, b) => {
            const orderA = roleOrder[a.familyRole || 'OTHER'] || 99;
            const orderB = roleOrder[b.familyRole || 'OTHER'] || 99;
            if (orderA !== orderB) return orderA - orderB;
            const dateA = a.birthDate ? new Date(a.birthDate).getTime() : 0;
            const dateB = b.birthDate ? new Date(b.birthDate).getTime() : 0;
            return dateA - dateB;
        });

        return family;
    }

    async createFamily(tenantId: string, data: any) {
        let kkjNumber = data.kkjNumber ? String(data.kkjNumber).trim() : null;
        if (!kkjNumber) {
            kkjNumber = await this.generateKkjNumber(tenantId);
        } else {
            const existing = await prisma.family.findFirst({
                where: { tenantId, kkjNumber }
            });
            if (existing) {
                throw new Error(`Nomor KKJ "${kkjNumber}" sudah terdaftar.`);
            }
        }

        const parsed = createFamilySchema.parse({ ...data, kkjNumber });

        // Unlink headOfFamilyId from any other family first to prevent unique constraint violation
        if (parsed.headOfFamilyId) {
            await prisma.family.updateMany({
                where: { headOfFamilyId: parsed.headOfFamilyId },
                data: { headOfFamilyId: null }
            });
        }

        const family = await prisma.family.create({
            data: {
                ...parsed,
                tenantId
            }
        });

        // If headOfFamilyId is specified, set member's familyId and familyRole = 'HEAD'
        if (parsed.headOfFamilyId) {
            await prisma.member.updateMany({
                where: { id: parsed.headOfFamilyId, tenantId },
                data: {
                    familyId: family.id,
                    familyRole: 'HEAD'
                }
            });
        }

        return this.getFamilyById(tenantId, family.id);
    }

    async updateFamily(tenantId: string, familyId: string, data: any) {
        const current = await prisma.family.findUnique({
            where: { id: familyId }
        });
        if (!current || current.tenantId !== tenantId) {
            throw new Error('Data keluarga tidak ditemukan');
        }

        const parsed = createFamilySchema.partial().parse(data);

        if (parsed.kkjNumber && parsed.kkjNumber !== current.kkjNumber) {
            const existing = await prisma.family.findFirst({
                where: { tenantId, kkjNumber: parsed.kkjNumber }
            });
            if (existing && existing.id !== familyId) {
                throw new Error(`Nomor KKJ "${parsed.kkjNumber}" sudah digunakan keluarga lain.`);
            }
        }

        // Handle headOfFamily changes
        if (parsed.headOfFamilyId !== undefined && parsed.headOfFamilyId !== current.headOfFamilyId) {
            if (parsed.headOfFamilyId) {
                // Release this member from being head of any other family to satisfy unique constraint
                await prisma.family.updateMany({
                    where: { headOfFamilyId: parsed.headOfFamilyId, id: { not: familyId } },
                    data: { headOfFamilyId: null }
                });

                await prisma.member.updateMany({
                    where: { id: parsed.headOfFamilyId, tenantId },
                    data: {
                        familyId: familyId,
                        familyRole: 'HEAD'
                    }
                });
            }
            if (current.headOfFamilyId && current.headOfFamilyId !== parsed.headOfFamilyId) {
                await prisma.member.updateMany({
                    where: { id: current.headOfFamilyId, tenantId, familyId },
                    data: { familyRole: 'SPOUSE' }
                });
            }
        }

        await prisma.family.update({
            where: { id: familyId, tenantId },
            data: {
                ...parsed
            }
        });

        return this.getFamilyById(tenantId, familyId);
    }

    async deleteFamily(tenantId: string, familyId: string) {
        const family = await prisma.family.findUnique({ where: { id: familyId } });
        if (!family || family.tenantId !== tenantId) {
            throw new Error('Data keluarga tidak ditemukan');
        }

        // Unlink all members
        await prisma.member.updateMany({
            where: { familyId, tenantId },
            data: {
                familyId: null,
                familyRole: null,
                familyRelation: null
            }
        });

        await prisma.family.delete({
            where: { id: familyId, tenantId }
        });

        return { message: 'Keluarga berhasil dihapus' };
    }

    async addFamilyMember(tenantId: string, familyId: string, data: any) {
        const family = await prisma.family.findUnique({ where: { id: familyId } });
        if (!family || family.tenantId !== tenantId) {
            throw new Error('Data keluarga tidak ditemukan');
        }

        let memberId: string;
        const role = data.familyRole || 'OTHER';

        if (data.existingMemberId) {
            const member = await prisma.member.findUnique({ where: { id: data.existingMemberId } });
            if (!member || member.tenantId !== tenantId) throw new Error('Data jemaat tidak ditemukan');

            memberId = member.id;
            await prisma.member.update({
                where: { id: memberId },
                data: {
                    familyId,
                    familyRole: role,
                    familyRelation: data.familyRelation || null,
                    birthPlace: data.birthPlace !== undefined ? data.birthPlace : member.birthPlace,
                    birthDate: data.birthDate ? new Date(data.birthDate) : (data.birthDate === null ? null : member.birthDate),
                    gender: data.gender !== undefined ? data.gender : member.gender,
                    education: data.education !== undefined ? data.education : member.education,
                    occupation: data.occupation !== undefined ? data.occupation : member.occupation,
                    isBaptized: data.isBaptized !== undefined ? Boolean(data.isBaptized) : member.isBaptized,
                    baptizedDate: data.baptizedDate ? new Date(data.baptizedDate) : (data.baptizedDate === null ? null : member.baptizedDate),
                    isChildDedicated: data.isChildDedicated !== undefined ? Boolean(data.isChildDedicated) : member.isChildDedicated,
                    childDedicatedDate: data.childDedicatedDate ? new Date(data.childDedicatedDate) : (data.childDedicatedDate === null ? null : member.childDedicatedDate),
                    isMarried: data.isMarried !== undefined ? Boolean(data.isMarried) : member.isMarried,
                    marriageDate: data.marriageDate ? new Date(data.marriageDate) : (data.marriageDate === null ? null : member.marriageDate),
                }
            });
        } else {
            const parsed = createMemberSchema.parse({
                ...data,
                familyId,
                familyRole: role
            });
            const created = await prisma.member.create({
                data: {
                    ...parsed,
                    tenantId,
                    familyId,
                    familyRole: role,
                    category: await getMemberCategory(tenantId, parsed.birthDate, parsed.category)
                }
            });
            memberId = created.id;
        }

        if (role === 'HEAD') {
            // Unlink memberId from any other family where they might be head
            await prisma.family.updateMany({
                where: { headOfFamilyId: memberId, id: { not: familyId } },
                data: { headOfFamilyId: null }
            });

            // Downgrade existing head in this family to SPOUSE if different
            const currentFam = await prisma.family.findUnique({ where: { id: familyId } });
            if (currentFam?.headOfFamilyId && currentFam.headOfFamilyId !== memberId) {
                await prisma.member.updateMany({
                    where: { id: currentFam.headOfFamilyId, familyId },
                    data: { familyRole: 'SPOUSE' }
                });
            }

            await prisma.family.update({
                where: { id: familyId },
                data: { headOfFamilyId: memberId }
            });
        }

        return this.getFamilyById(tenantId, familyId);
    }

    async updateFamilyMember(tenantId: string, familyId: string, memberId: string, data: any) {
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member || member.tenantId !== tenantId || member.familyId !== familyId) {
            throw new Error('Data anggota keluarga tidak ditemukan');
        }

        const role = data.familyRole !== undefined ? data.familyRole : member.familyRole;

        await prisma.member.update({
            where: { id: memberId },
            data: {
                firstName: data.firstName !== undefined ? data.firstName : member.firstName,
                lastName: data.lastName !== undefined ? data.lastName : member.lastName,
                gender: data.gender !== undefined ? data.gender : member.gender,
                birthPlace: data.birthPlace !== undefined ? data.birthPlace : member.birthPlace,
                birthDate: data.birthDate ? new Date(data.birthDate) : (data.birthDate === null ? null : member.birthDate),
                familyRole: role,
                familyRelation: data.familyRelation !== undefined ? data.familyRelation : member.familyRelation,
                education: data.education !== undefined ? data.education : member.education,
                occupation: data.occupation !== undefined ? data.occupation : member.occupation,
                isBaptized: data.isBaptized !== undefined ? Boolean(data.isBaptized) : member.isBaptized,
                baptizedDate: data.baptizedDate ? new Date(data.baptizedDate) : (data.baptizedDate === null ? null : member.baptizedDate),
                isChildDedicated: data.isChildDedicated !== undefined ? Boolean(data.isChildDedicated) : member.isChildDedicated,
                childDedicatedDate: data.childDedicatedDate ? new Date(data.childDedicatedDate) : (data.childDedicatedDate === null ? null : member.childDedicatedDate),
                isMarried: data.isMarried !== undefined ? Boolean(data.isMarried) : member.isMarried,
                marriageDate: data.marriageDate ? new Date(data.marriageDate) : (data.marriageDate === null ? null : member.marriageDate),
                phone: data.phone !== undefined ? data.phone : member.phone,
                email: data.email !== undefined ? (data.email || null) : member.email,
            }
        });

        if (role === 'HEAD') {
            // Unlink memberId from any other family where they might be head
            await prisma.family.updateMany({
                where: { headOfFamilyId: memberId, id: { not: familyId } },
                data: { headOfFamilyId: null }
            });

            // Downgrade existing head in this family to SPOUSE if different
            const currentFam = await prisma.family.findUnique({ where: { id: familyId } });
            if (currentFam?.headOfFamilyId && currentFam.headOfFamilyId !== memberId) {
                await prisma.member.updateMany({
                    where: { id: currentFam.headOfFamilyId, familyId },
                    data: { familyRole: 'SPOUSE' }
                });
            }

            await prisma.family.update({
                where: { id: familyId },
                data: { headOfFamilyId: memberId }
            });
        } else {
            const family = await prisma.family.findUnique({ where: { id: familyId } });
            if (family && family.headOfFamilyId === memberId && role !== 'HEAD') {
                await prisma.family.update({
                    where: { id: familyId },
                    data: { headOfFamilyId: null }
                });
            }
        }

        return this.getFamilyById(tenantId, familyId);
    }

    async removeFamilyMember(tenantId: string, familyId: string, memberId: string) {
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member || member.tenantId !== tenantId || member.familyId !== familyId) {
            throw new Error('Data anggota keluarga tidak ditemukan');
        }

        await prisma.member.update({
            where: { id: memberId },
            data: {
                familyId: null,
                familyRole: null,
                familyRelation: null
            }
        });

        const family = await prisma.family.findUnique({ where: { id: familyId } });
        if (family && family.headOfFamilyId === memberId) {
            await prisma.family.update({
                where: { id: familyId },
                data: { headOfFamilyId: null }
            });
        }

        return this.getFamilyById(tenantId, familyId);
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
