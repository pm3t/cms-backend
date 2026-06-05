import { prisma } from '../../prisma';
import { z } from 'zod';
import { GroupType, GroupRole } from '@prisma/client';

export const createGroupSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    type: z.nativeEnum(GroupType).optional(),
    meetingSchedule: z.string().optional(),
    location: z.string().optional()
});

export const addMemberSchema = z.object({
    memberId: z.string(),
    role: z.nativeEnum(GroupRole).optional()
});

export const createMeetingSchema = z.object({
    date: z.string().datetime(),
    title: z.string().optional(),
    notes: z.string().optional()
});

export const recordAttendanceSchema = z.object({
    attendances: z.array(z.object({
        memberId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "EXCUSED"])
    }))
});

export class SmallGroupService {
    // --- GROUPS ---
    async listGroups(tenantId: string) {
        return prisma.smallGroup.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async getGroup(tenantId: string, groupId: string) {
        const group = await prisma.smallGroup.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: { member: true }
                },
                meetings: {
                    orderBy: { date: 'desc' },
                    take: 5
                }
            }
        });
        if (!group || group.tenantId !== tenantId) throw new Error('Small group not found');
        return group;
    }

    async createGroup(tenantId: string, data: any) {
        const parsed = createGroupSchema.parse(data);
        return prisma.smallGroup.create({
            data: {
                ...parsed,
                tenantId
            }
        });
    }

    async updateGroup(tenantId: string, groupId: string, data: any) {
        await this.getGroup(tenantId, groupId);
        const parsed = createGroupSchema.partial().parse(data);
        return prisma.smallGroup.update({
            where: { id: groupId },
            data: parsed
        });
    }

    async deleteGroup(tenantId: string, groupId: string) {
        await this.getGroup(tenantId, groupId);
        return prisma.smallGroup.delete({
            where: { id: groupId }
        });
    }

    // --- MEMBERSHIP ---
    async addMember(tenantId: string, groupId: string, data: any) {
        await this.getGroup(tenantId, groupId);
        const parsed = addMemberSchema.parse(data);

        // Verify member belongs to tenant
        const member = await prisma.member.findUnique({ where: { id: parsed.memberId } });
        if (!member || member.tenantId !== tenantId) throw new Error('Member not found');

        return prisma.smallGroupMember.upsert({
            where: {
                groupId_memberId: {
                    groupId,
                    memberId: parsed.memberId
                }
            },
            update: {
                role: parsed.role || GroupRole.MEMBER
            },
            create: {
                groupId,
                memberId: parsed.memberId,
                role: parsed.role || GroupRole.MEMBER
            }
        });
    }

    async removeMember(tenantId: string, groupId: string, memberId: string) {
        await this.getGroup(tenantId, groupId);
        return prisma.smallGroupMember.delete({
            where: {
                groupId_memberId: {
                    groupId,
                    memberId
                }
            }
        });
    }

    async updateMemberRole(tenantId: string, groupId: string, memberId: string, role: GroupRole) {
        await this.getGroup(tenantId, groupId);
        return prisma.smallGroupMember.update({
            where: {
                groupId_memberId: {
                    groupId,
                    memberId
                }
            },
            data: { role }
        });
    }

    // --- MEETINGS & ATTENDANCE ---
    async listMeetings(tenantId: string, groupId: string) {
        await this.getGroup(tenantId, groupId);
        return prisma.smallGroupMeeting.findMany({
            where: { groupId },
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { attendance: true }
                }
            }
        });
    }

    async createMeeting(tenantId: string, groupId: string, data: any) {
        await this.getGroup(tenantId, groupId);
        const parsed = createMeetingSchema.parse(data);
        return prisma.smallGroupMeeting.create({
            data: {
                groupId,
                date: new Date(parsed.date),
                title: parsed.title,
                notes: parsed.notes
            }
        });
    }

    async getMeeting(tenantId: string, meetingId: string) {
        const meeting = await prisma.smallGroupMeeting.findUnique({
            where: { id: meetingId },
            include: {
                group: true,
                attendance: {
                    include: { member: true }
                }
            }
        });
        if (!meeting || meeting.group.tenantId !== tenantId) throw new Error('Meeting not found');
        return meeting;
    }

    async recordAttendance(tenantId: string, meetingId: string, data: any) {
        const meeting = await this.getMeeting(tenantId, meetingId);
        const parsed = recordAttendanceSchema.parse(data);

        // Ensure all members belong to the group or at least the tenant
        // To keep it simple, we just upsert the attendance records
        const results = await prisma.$transaction(
            parsed.attendances.map(att => 
                prisma.smallGroupAttendance.upsert({
                    where: {
                        meetingId_memberId: {
                            meetingId,
                            memberId: att.memberId
                        }
                    },
                    update: { status: att.status },
                    create: {
                        meetingId,
                        memberId: att.memberId,
                        status: att.status
                    }
                })
            )
        );

        return results;
    }
}
