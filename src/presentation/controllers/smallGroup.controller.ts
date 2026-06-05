import { Request, Response, NextFunction } from 'express';
import { SmallGroupService } from '../../domain/smallGroup/smallGroup.service';

const smallGroupService = new SmallGroupService();

export const smallGroupController = {
    // --- GROUPS ---
    async getGroups(req: any, res: Response, next: NextFunction) {
        try {
            const groups = await smallGroupService.listGroups(req.user.tenantId);
            res.json(groups);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    async getGroupById(req: any, res: Response, next: NextFunction) {
        try {
            const group = await smallGroupService.getGroup(req.user.tenantId, req.params.id);
            res.json(group);
        } catch (err: any) {
            res.status(404).json({ error: err.message });
        }
    },

    async createGroup(req: any, res: Response, next: NextFunction) {
        try {
            const group = await smallGroupService.createGroup(req.user.tenantId, req.body);
            res.status(201).json(group);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async updateGroup(req: any, res: Response, next: NextFunction) {
        try {
            const group = await smallGroupService.updateGroup(req.user.tenantId, req.params.id, req.body);
            res.json(group);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async deleteGroup(req: any, res: Response, next: NextFunction) {
        try {
            await smallGroupService.deleteGroup(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // --- MEMBERSHIP ---
    async addMember(req: any, res: Response, next: NextFunction) {
        try {
            const membership = await smallGroupService.addMember(req.user.tenantId, req.params.id, req.body);
            res.status(201).json(membership);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async removeMember(req: any, res: Response, next: NextFunction) {
        try {
            await smallGroupService.removeMember(req.user.tenantId, req.params.id, req.params.memberId);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async updateMemberRole(req: any, res: Response, next: NextFunction) {
        try {
            const membership = await smallGroupService.updateMemberRole(req.user.tenantId, req.params.id, req.params.memberId, req.body.role);
            res.json(membership);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // --- MEETINGS & ATTENDANCE ---
    async getMeetings(req: any, res: Response, next: NextFunction) {
        try {
            const meetings = await smallGroupService.listMeetings(req.user.tenantId, req.params.id);
            res.json(meetings);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async createMeeting(req: any, res: Response, next: NextFunction) {
        try {
            const meeting = await smallGroupService.createMeeting(req.user.tenantId, req.params.id, req.body);
            res.status(201).json(meeting);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async getMeetingById(req: any, res: Response, next: NextFunction) {
        try {
            const meeting = await smallGroupService.getMeeting(req.user.tenantId, req.params.meetingId);
            res.json(meeting);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    },

    async recordAttendance(req: any, res: Response, next: NextFunction) {
        try {
            const results = await smallGroupService.recordAttendance(req.user.tenantId, req.params.meetingId, req.body);
            res.json(results);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    }
};
