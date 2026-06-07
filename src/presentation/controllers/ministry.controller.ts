import { Request, Response } from 'express';
import { MinistryService } from '../../domain/ministry/ministry.service';

export class MinistryController {
    static async getMinistries(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const ministries = await MinistryService.listMinistries(tenantId);
            res.json(ministries);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createMinistry(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const ministry = await MinistryService.createMinistry(tenantId, req.body);
            res.status(201).json(ministry);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateMinistry(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            const ministry = await MinistryService.updateMinistry(tenantId, id as string, req.body);
            res.json(ministry);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteMinistry(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            await MinistryService.deleteMinistry(tenantId, id as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async addMember(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { ministryId, memberId, role } = req.body;
            const result = await MinistryService.addMemberToMinistry(tenantId, ministryId, memberId, role);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getRecruitments(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const recruitments = await MinistryService.listRecruitments(tenantId);
            res.json(recruitments);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createRecruitment(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { ministryId, ...data } = req.body;
            const recruitment = await MinistryService.createRecruitment(tenantId, ministryId, data);
            res.status(201).json(recruitment);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateRecruitment(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            const recruitment = await MinistryService.updateRecruitment(tenantId, id as string, req.body);
            res.json(recruitment);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteRecruitment(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            await MinistryService.deleteRecruitment(tenantId, id as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getApplications(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { recruitmentId } = req.params;
            const applications = await MinistryService.listApplications(tenantId, recruitmentId as string);
            res.json(applications);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateApplicationStatus(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { applicationId } = req.params;
            const { status } = req.body;
            const result = await MinistryService.updateApplicationStatus(tenantId, applicationId as string, status);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getRosters(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { startDate, endDate } = req.query;
            const rosters = await MinistryService.getRosters(
                tenantId, 
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );
            res.json(rosters);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createRoster(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const roster = await MinistryService.createRoster(tenantId, {
                ...req.body,
                date: new Date(req.body.date)
            });
            res.status(201).json(roster);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateRoster(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            const roster = await MinistryService.updateRoster(tenantId, id as string, {
                ...req.body,
                date: new Date(req.body.date)
            });
            res.json(roster);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteRoster(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            await MinistryService.deleteRoster(tenantId, id as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getSkills(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const skills = await MinistryService.listSkills(tenantId);
            res.json(skills);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createSkill(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { name, description } = req.body;
            const skill = await MinistryService.createSkill(tenantId, name, description);
            res.status(201).json(skill);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateSkill(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            const { name, description } = req.body;
            const skill = await MinistryService.updateSkill(tenantId, id as string, name, description);
            res.json(skill);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteSkill(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { id } = req.params;
            await MinistryService.deleteSkill(tenantId, id as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async assignSkill(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { memberId } = req.params;
            const { skillId, proficiency } = req.body;
            const result = await MinistryService.addSkillToMember(tenantId, memberId as string, skillId, proficiency);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async removeSkill(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { memberId, skillId } = req.params;
            await MinistryService.removeSkillFromMember(tenantId, memberId as string, skillId as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    static async searchTalents(req: Request, res: Response) {
        try {
            const tenantId = (req as any).user.tenantId;
            const { skillId } = req.params;
            const talents = await MinistryService.searchTalents(tenantId, skillId as string);
            res.json(talents);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
}
