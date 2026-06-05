import { Response } from 'express';
import { FinanceAdvancedService } from '../../domain/finance/finance_advanced.service';

const advancedService = new FinanceAdvancedService();

export const financeAdvancedController = {
  // Projects
  async listProjects(req: any, res: Response) {
    try {
      const result = await advancedService.listProjects(req.user.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getProject(req: any, res: Response) {
    try {
      const result = await advancedService.getProject(req.user.tenantId, req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async createProject(req: any, res: Response) {
    try {
      const result = await advancedService.createProject(req.user.tenantId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateProject(req: any, res: Response) {
    try {
      await advancedService.updateProject(req.user.tenantId, req.params.id, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // Pledges
  async listPledges(req: any, res: Response) {
    try {
      const result = await advancedService.listPledges(req.user.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async createPledge(req: any, res: Response) {
    try {
      const result = await advancedService.createPledge(req.user.tenantId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getPledgeProgress(req: any, res: Response) {
    try {
      const result = await advancedService.getPledgeProgress(req.user.tenantId, req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // Budgets
  async listBudgets(req: any, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const result = await advancedService.listBudgets(req.user.tenantId, year);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async setBudget(req: any, res: Response) {
    try {
      const result = await advancedService.setBudget(req.user.tenantId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getBudgetVariance(req: any, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const result = await advancedService.getBudgetVariance(req.user.tenantId, year, month);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
