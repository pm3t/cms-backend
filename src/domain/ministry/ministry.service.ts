import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MinistryService {
    // --- Ministry Management ---
    static async listMinistries(tenantId: string) {
        return prisma.ministry.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { members: true }
                }
            }
        });
    }

    static async createMinistry(tenantId: string, data: { name: string, description?: string }) {
        return prisma.ministry.create({
            data: { ...data, tenantId }
        });
    }

    static async updateMinistry(tenantId: string, id: string, data: { name: string, description?: string }) {
        const ministry = await prisma.ministry.findFirst({ where: { id, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.ministry.update({
            where: { id },
            data
        });
    }

    static async deleteMinistry(tenantId: string, id: string) {
        const ministry = await prisma.ministry.findFirst({ where: { id, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.ministry.delete({ where: { id } });
    }

    static async getMinistryDetails(tenantId: string, id: string) {
        return prisma.ministry.findFirst({
            where: { id, tenantId },
            include: {
                members: {
                    include: { member: true }
                },
                recruitments: true,
                rosters: {
                    include: { 
                        positions: { include: { member: true } },
                        worshipService: true,
                        event: true
                    }
                }
            }
        });
    }

    static async addMemberToMinistry(tenantId: string, ministryId: string, memberId: string, role: string) {
        // Verify ministry belongs to tenant
        const ministry = await prisma.ministry.findFirst({ where: { id: ministryId, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.ministryMember.create({
            data: { ministryId, memberId, role }
        });
    }

    static async removeMemberFromMinistry(tenantId: string, ministryId: string, memberId: string) {
        // Verify ministry belongs to tenant
        const ministry = await prisma.ministry.findFirst({ where: { id: ministryId, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.ministryMember.delete({
            where: {
                ministryId_memberId: {
                    ministryId,
                    memberId
                }
            }
        });
    }

    // --- Volunteer Recruitment ---
    static async listRecruitments(tenantId: string) {
        return prisma.volunteerRecruitment.findMany({
            where: { ministry: { tenantId } },
            include: {
                ministry: { select: { name: true } },
                _count: { select: { applications: true } }
            }
        });
    }

    static async listApplications(tenantId: string, recruitmentId: string) {
        return prisma.volunteerApplication.findMany({
            where: {
                recruitmentId,
                recruitment: { ministry: { tenantId } }
            },
            include: {
                member: { select: { firstName: true, lastName: true, email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async createRecruitment(tenantId: string, ministryId: string, data: { title: string, description: string, requirements?: string }) {
        const ministry = await prisma.ministry.findFirst({ where: { id: ministryId, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.volunteerRecruitment.create({
            data: { ...data, ministryId }
        });
    }

    static async updateRecruitment(tenantId: string, id: string, data: { title?: string, description?: string, requirements?: string, status?: string }) {
        const recruitment = await prisma.volunteerRecruitment.findFirst({
            where: { id, ministry: { tenantId } }
        });
        if (!recruitment) throw new Error('Recruitment not found');

        return prisma.volunteerRecruitment.update({
            where: { id },
            data
        });
    }

    static async deleteRecruitment(tenantId: string, id: string) {
        const recruitment = await prisma.volunteerRecruitment.findFirst({
            where: { id, ministry: { tenantId } }
        });
        if (!recruitment) throw new Error('Recruitment not found');

        return prisma.volunteerRecruitment.delete({ where: { id } });
    }

    static async applyForVolunteer(memberId: string, recruitmentId: string, notes?: string) {
        return prisma.volunteerApplication.create({
            data: { memberId, recruitmentId, notes }
        });
    }

    static async updateApplicationStatus(tenantId: string, applicationId: string, status: string) {
        // Verify application belongs to tenant via recruitment -> ministry
        const app = await prisma.volunteerApplication.findFirst({
            where: { 
                id: applicationId,
                recruitment: { ministry: { tenantId } }
            }
        });
        if (!app) throw new Error('Application not found');

        return prisma.volunteerApplication.update({
            where: { id: applicationId },
            data: { status }
        });
    }

    // --- Service Roster & Scheduling ---
    static async createRoster(tenantId: string, data: {
        ministryId: string,
        date: Date,
        worshipServiceId?: string,
        eventId?: string,
        startTime?: string,
        endTime?: string,
        positions: { role: string, memberId?: string, notes?: string }[]
    }) {
        const { positions, ...rosterData } = data;
        
        // Verify ministry belongs to tenant
        const ministry = await prisma.ministry.findFirst({ where: { id: data.ministryId, tenantId } });
        if (!ministry) throw new Error('Ministry not found');

        return prisma.serviceRoster.create({
            data: {
                ...rosterData,
                positions: {
                    create: positions
                }
            },
            include: { positions: true }
        });
    }

    static async getRosters(tenantId: string, startDate?: Date, endDate?: Date) {
        return prisma.serviceRoster.findMany({
            where: {
                ministry: { tenantId },
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                ministry: { select: { name: true } },
                worshipService: { select: { name: true } },
                event: { select: { title: true } },
                positions: {
                    include: { member: { select: { firstName: true, lastName: true } } }
                }
            },
            orderBy: { date: 'asc' }
        });
    }

    static async updateRoster(tenantId: string, id: string, data: {
        date: Date,
        worshipServiceId?: string | null,
        eventId?: string | null,
        startTime?: string,
        endTime?: string,
        positions: { role: string, memberId?: string | null, notes?: string }[]
    }) {
        const { positions, ...rosterData } = data;

        // Verify roster belongs to a ministry of this tenant
        const roster = await prisma.serviceRoster.findFirst({
            where: {
                id,
                ministry: { tenantId }
            }
        });
        if (!roster) throw new Error('Roster not found');

        return prisma.$transaction(async (tx) => {
            // 1. Delete all existing positions for this roster
            await tx.servicePosition.deleteMany({
                where: { rosterId: id }
            });

            // 2. Update the roster header details and recreate positions
            return tx.serviceRoster.update({
                where: { id },
                data: {
                    ...rosterData,
                    positions: {
                        create: positions.map(p => ({
                            role: p.role,
                            memberId: p.memberId || null,
                            notes: p.notes
                        }))
                    }
                },
                include: { positions: true }
            });
        });
    }

    static async deleteRoster(tenantId: string, id: string) {
        // Verify roster belongs to a ministry of this tenant
        const roster = await prisma.serviceRoster.findFirst({
            where: {
                id,
                ministry: { tenantId }
            }
        });
        if (!roster) throw new Error('Roster not found');

        return prisma.serviceRoster.delete({
            where: { id }
        });
    }

    // --- Skill/Talent Database ---
    static async listSkills(tenantId: string) {
        return prisma.skill.findMany({
            where: {
                OR: [
                    { tenantId },
                    { tenantId: null }
                ]
            },
            include: {
                _count: {
                    select: {
                        members: {
                            where: {
                                member: { tenantId }
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    static async createSkill(tenantId: string, name: string, description?: string) {
        return prisma.skill.create({
            data: { name, description, tenantId }
        });
    }

    static async updateSkill(tenantId: string, id: string, name: string, description?: string) {
        const skill = await prisma.skill.findFirst({ where: { id, tenantId } });
        if (!skill) throw new Error('Skill not found or access denied');
        return prisma.skill.update({
            where: { id },
            data: { name, description }
        });
    }

    static async deleteSkill(tenantId: string, id: string) {
        const skill = await prisma.skill.findFirst({ where: { id, tenantId } });
        if (!skill) throw new Error('Skill not found or access denied');
        return prisma.skill.delete({
            where: { id }
        });
    }

    static async addSkillToMember(tenantId: string, memberId: string, skillId: string, proficiency?: number) {
        // Verify member belongs to tenant
        const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
        if (!member) throw new Error('Member not found or access denied');

        // Verify skill is either global (tenantId: null) or belongs to this tenant
        const skill = await prisma.skill.findFirst({
            where: {
                id: skillId,
                OR: [
                    { tenantId },
                    { tenantId: null }
                ]
            }
        });
        if (!skill) throw new Error('Skill not found or access denied');

        return prisma.memberSkill.upsert({
            where: { memberId_skillId: { memberId, skillId } },
            update: { proficiency },
            create: { memberId, skillId, proficiency }
        });
    }

    static async removeSkillFromMember(tenantId: string, memberId: string, skillId: string) {
        // Verify member belongs to tenant
        const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
        if (!member) throw new Error('Member not found or access denied');

        return prisma.memberSkill.delete({
            where: { memberId_skillId: { memberId, skillId } }
        });
    }

    static async searchTalents(tenantId: string, skillId: string) {
        return prisma.member.findMany({
            where: {
                tenantId,
                skills: {
                    some: { skillId }
                }
            },
            include: {
                skills: {
                    where: { skillId },
                    include: { skill: true }
                }
            }
        });
    }
}
