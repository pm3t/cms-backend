import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

const app: Express = express();

// Middlewares
// CORS: allow frontend origin (set FRONTEND_URL env var in production)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['*'];

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false,
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(morgan('dev'));

// Static files (member photos & documents)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
import authRoutes from './presentation/routes/auth.routes';
import tenantRoutes from './presentation/routes/tenant.routes';
import memberRoutes from './presentation/routes/member.routes';
import announcementRoutes from './presentation/routes/announcement.routes';
import communicationRoutes from './presentation/routes/communication.routes';
import financeRoutes from './presentation/routes/finance.routes';
import eventRoutes from './presentation/routes/event.routes';
import attendanceRoutes from './presentation/routes/attendance.routes';
import { smallGroupRoutes } from './presentation/routes/smallGroup.routes';
import superAdminRoutes from './presentation/routes/superAdmin.routes';
import billingRoutes from './presentation/routes/billing.routes';
import userRoutes from './presentation/routes/user.routes';
import webhookRoutes from './presentation/routes/webhook.routes';
import newsletterRoutes from './presentation/routes/newsletter.routes';
import financeAdvancedRoutes from './presentation/routes/finance_advanced.routes';
import publicRoutes from './presentation/routes/public.routes';
import ministryRoutes from './presentation/routes/ministry.routes';
import pastoralRoutes from './presentation/routes/pastoral.routes';
import documentRoutes from './presentation/routes/document.routes';
import facilityRoutes from './presentation/routes/facility.routes';
import reportingRoutes from './presentation/routes/reporting.routes';
import mobileRoutes from './presentation/routes/mobile.routes';
import digitalRoutes from './presentation/routes/digital.routes';
import devotionRoutes from './presentation/routes/devotion.routes';
import jobRoutes from './presentation/routes/job.routes';
import { startSubscriptionCronJobs } from './jobs/subscription.job';
import { startNotificationCronJobs } from './jobs/notification.job';
import { startMemberCronJobs } from './jobs/member.job';

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/finance/advanced', financeAdvancedRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/groups', smallGroupRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ministry', ministryRoutes);
app.use('/api/pastoral', pastoralRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/facility', facilityRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/digital', digitalRoutes);
app.use('/api/devotions', devotionRoutes);
app.use('/api/jobs', jobRoutes);

// Start Cron Jobs
startSubscriptionCronJobs();
startNotificationCronJobs();
startMemberCronJobs();

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generic Error Handler mapped to clean architecture
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

export default app;
