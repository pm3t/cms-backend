import { Router } from 'express';
import { reportingController } from '../controllers/reporting.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { SubscriptionGate, FeatureGate } from '../middlewares/featureGate.middleware';

const reportingRouter = Router();

reportingRouter.use(authenticateJWT);
reportingRouter.use(SubscriptionGate);
reportingRouter.use(FeatureGate('advanced_reporting'));

// Stats & Dashboards
reportingRouter.get('/dashboard/kpi', reportingController.getDashboardKPIs);
reportingRouter.get('/membership/stats', reportingController.getMembershipStats);
reportingRouter.get('/attendance/stats', reportingController.getAttendanceStats);
reportingRouter.get('/finance/stats', reportingController.getFinancialStats);

// Analytics
reportingRouter.get('/analytics/growth', reportingController.getGrowthAnalytics);
reportingRouter.get('/analytics/engagement', reportingController.getEngagementMetrics);
reportingRouter.get('/analytics/financial', reportingController.getFinancialAnalytics);
reportingRouter.get('/analytics/benchmark', reportingController.getBenchmarking);

// Custom Reports
reportingRouter.post('/custom/execute', reportingController.executeCustomReport);
reportingRouter.get('/templates', reportingController.getTemplates);
reportingRouter.post('/templates', reportingController.saveTemplate);
reportingRouter.delete('/templates/:id', reportingController.deleteTemplate);

export default reportingRouter;
