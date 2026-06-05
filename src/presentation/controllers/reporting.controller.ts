import { Response } from 'express';
import { ReportingService } from '../../domain/reporting/reporting.service';
import { ReportModule } from '@prisma/client';

const reportingService = new ReportingService();

export const reportingController = {
  async getDashboardKPIs(req: any, res: Response) {
    try { res.json(await reportingService.getDashboardKPIs(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getMembershipStats(req: any, res: Response) {
    try { res.json(await reportingService.getMembershipStats(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getAttendanceStats(req: any, res: Response) {
    try { res.json(await reportingService.getAttendanceStats(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getFinancialStats(req: any, res: Response) {
    try { res.json(await reportingService.getFinancialStats(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // --- Advanced Analytics ---
  async getGrowthAnalytics(req: any, res: Response) {
    try { res.json(await reportingService.getGrowthAnalytics(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getEngagementMetrics(req: any, res: Response) {
    try { res.json(await reportingService.getEngagementMetrics(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getFinancialAnalytics(req: any, res: Response) {
    try { res.json(await reportingService.getFinancialAnalytics(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },
  async getBenchmarking(req: any, res: Response) {
    try { res.json(await reportingService.getBenchmarking(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async executeCustomReport(req: any, res: Response) {
    try {
      const { module, config } = req.body;
      if (!Object.values(ReportModule).includes(module)) return res.status(400).json({ error: 'Invalid module' });
      res.json(await reportingService.executeCustomReport(req.user.tenantId, module, config));
    }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getTemplates(req: any, res: Response) {
    try { res.json(await reportingService.getTemplates(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async saveTemplate(req: any, res: Response) {
    try { res.status(201).json(await reportingService.saveTemplate(req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.errors ?? e.message }); }
  },

  async deleteTemplate(req: any, res: Response) {
    try { await reportingService.deleteTemplate(req.user.tenantId, req.params.id); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  }
};
