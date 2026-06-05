import { Request, Response, NextFunction } from 'express';
import { MemberService, FamilyService, SacramentService } from '../../domain/member/member.service';
import { prisma } from '../../prisma';

const memberService = new MemberService();
const familyService = new FamilyService();
const sacramentService = new SacramentService();

export const memberController = {
    // --- MEMBERS ---
    async getMembers(req: any, res: Response, next: NextFunction) {
        try {
            const records = await memberService.listMembers(req.user.tenantId);
            res.json(records);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    async getMemberById(req: any, res: Response, next: NextFunction) {
        try {
            const record = await memberService.getMember(req.user.tenantId, req.params.id);
            res.json(record);
        } catch (err: any) {
            res.status(404).json({ error: err.message });
        }
    },

    async createMember(req: any, res: Response, next: NextFunction) {
        try {
            const { subscriptionService } = await import('../../domain/subscription/subscription.service');
            const isWithinLimit = await subscriptionService.isWithinLimit(req.user.tenantId, 'max_members');
            if (!isWithinLimit) {
                return res.status(403).json({ error: 'Upgrade required: You have reached the maximum number of members allowed for your current plan.' });
            }

            const member = await memberService.createMember(req.user.tenantId, req.body);
            res.status(201).json(member);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async updateMember(req: any, res: Response, next: NextFunction) {
        try {
            const member = await memberService.updateMember(req.user.tenantId, req.params.id, req.body);
            res.json(member);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async deleteMember(req: any, res: Response, next: NextFunction) {
        try {
            await memberService.deleteMember(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async bulkDeleteMembers(req: any, res: Response, next: NextFunction) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0)
                return res.status(400).json({ error: 'ids must be a non-empty array.' });
            const result = await memberService.bulkDeleteMembers(req.user.tenantId, ids);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async uploadPhoto(req: any, res: Response, next: NextFunction) {
        try {
            const file = (req as any).file;
            if (!file) return res.status(400).json({ error: 'No file uploaded.' });

            const memberId = req.params.id;
            // Verify member belongs to this tenant
            await memberService.getMember(req.user.tenantId, memberId);

            const photoUrl = `/uploads/member-photos/${file.filename}`;

            await prisma.member.update({
                where: { id: memberId },
                data: { photoUrl }
            });

            res.json({ photoUrl });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async importCsv(req: any, res: Response, next: NextFunction) {
        try {
            const { members } = req.body;
            if (!Array.isArray(members)) return res.status(400).json({ error: 'Payload must possess members array.' });

            const result = await memberService.importMembers(req.user.tenantId, members);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // --- FAMILIES ---
    async getFamilies(req: any, res: Response, next: NextFunction) {
        try {
            const families = await familyService.listFamilies(req.user.tenantId);
            res.json(families);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    async createFamily(req: any, res: Response, next: NextFunction) {
        try {
            const family = await familyService.createFamily(req.user.tenantId, req.body);
            res.status(201).json(family);
        } catch (error: any) {
            if (error.errors) return res.status(400).json({ error: error.errors });
            res.status(400).json({ error: error.message });
        }
    },

    async updateFamily(req: any, res: Response, next: NextFunction) {
        try {
            const family = await familyService.updateFamily(req.user.tenantId, req.params.id, req.body);
            res.json(family);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    // --- SACRAMENTS ---
    async addSacrament(req: any, res: Response, next: NextFunction) {
        try {
            const sacrament = await sacramentService.addSacrament(req.user.tenantId, req.params.memberId, req.body);
            res.status(201).json(sacrament);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async deleteSacrament(req: any, res: Response, next: NextFunction) {
        try {
            await sacramentService.deleteSacrament(req.user.tenantId, req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async resetMobilePassword(req: any, res: Response, next: NextFunction) {
        try {
            const member = await memberService.resetMobilePassword(req.user.tenantId, req.params.id, req.body);
            res.json({ message: 'Password mobile berhasil direset', member });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
};
