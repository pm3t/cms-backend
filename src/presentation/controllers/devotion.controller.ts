import { Response } from 'express';
import { DevotionService } from '../../domain/devotion/devotion.service';

const devotionService = new DevotionService();

export const devotionController = {
  // --- Admin Devotion Endpoints ---
  async getDevotions(req: any, res: Response) {
    try {
      const { search, startDate, endDate } = req.query;
      res.json(await devotionService.getDevotions(req.user.tenantId, { search, startDate, endDate }));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getDevotionById(req: any, res: Response) {
    try {
      res.json(await devotionService.getDevotionById(req.user.tenantId, req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async createDevotion(req: any, res: Response) {
    try {
      res.status(201).json(await devotionService.createDevotion(req.user.tenantId, req.body));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async updateDevotion(req: any, res: Response) {
    try {
      res.json(await devotionService.updateDevotion(req.user.tenantId, req.params.id, req.body));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteDevotion(req: any, res: Response) {
    try {
      await devotionService.deleteDevotion(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // --- Admin Bible Plan Endpoints ---
  async getBiblePlans(req: any, res: Response) {
    try {
      res.json(await devotionService.getBiblePlans(req.user.tenantId));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getBiblePlanById(req: any, res: Response) {
    try {
      res.json(await devotionService.getBiblePlanById(req.user.tenantId, req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async createBiblePlan(req: any, res: Response) {
    try {
      res.status(201).json(await devotionService.createBiblePlan(req.user.tenantId, req.body));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async updateBiblePlan(req: any, res: Response) {
    try {
      res.json(await devotionService.updateBiblePlan(req.user.tenantId, req.params.id, req.body));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteBiblePlan(req: any, res: Response) {
    try {
      await devotionService.deleteBiblePlan(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // --- Mobile Endpoints (Authed Member) ---
  async getTodayDevotion(req: any, res: Response) {
    try {
      // In mobile app routes, req.user holds member's info (memberId and tenantId)
      res.json(await devotionService.getTodayDevotion(req.user.tenantId));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getMobileBiblePlans(req: any, res: Response) {
    try {
      res.json(await devotionService.getBiblePlans(req.user.tenantId));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getMobileBiblePlanById(req: any, res: Response) {
    try {
      res.json(await devotionService.getBiblePlanById(req.user.tenantId, req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async enrollInBiblePlan(req: any, res: Response) {
    try {
      res.json(await devotionService.enrollInBiblePlan(req.user.memberId, req.user.tenantId, req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getMemberProgress(req: any, res: Response) {
    try {
      res.json(await devotionService.getMemberProgress(req.user.memberId, req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getMemberAllEnrollments(req: any, res: Response) {
    try {
      res.json(await devotionService.getMemberAllEnrollments(req.user.memberId));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async completeDayInBiblePlan(req: any, res: Response) {
    try {
      const { dayNumber } = req.body;
      if (typeof dayNumber !== 'number') return res.status(400).json({ error: 'dayNumber must be a number' });
      res.json(await devotionService.completeDayInBiblePlan(req.user.memberId, req.params.id, dayNumber));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async uncompleteDayInBiblePlan(req: any, res: Response) {
    try {
      const { dayNumber } = req.body;
      if (typeof dayNumber !== 'number') return res.status(400).json({ error: 'dayNumber must be a number' });
      res.json(await devotionService.uncompleteDayInBiblePlan(req.user.memberId, req.params.id, dayNumber));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
};
