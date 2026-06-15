import { prisma } from '../../prisma';
import { z } from 'zod';
import { ReportModule } from '@prisma/client';

export const reportTemplateSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  description: z.string().optional().nullable(),
  module: z.nativeEnum(ReportModule),
  config: z.any(), // JSON object for custom report config
  isPublic: z.boolean().default(false),
});

export class ReportingService {
  async getDashboardKPIs(tenantId: string) {
    const [totalMembers, totalBookings, pendingBookings] = await Promise.all([
      prisma.member.count({ where: { tenantId } }),
      prisma.facilityBooking.count({ where: { tenantId } }),
      prisma.facilityBooking.count({ where: { tenantId, status: 'PENDING' } }),
    ]);

    // Financial KPI for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    
    // We get financial records for current month
    const financialRecords = await prisma.financialRecord.findMany({
      where: {
        tenantId,
        date: { gte: startOfMonth },
        paymentStatus: 'COMPLETED'
      }
    });

    const income = financialRecords.filter(r => r.type === 'OFFERING' || r.type === 'DONATION').reduce((a, b) => a + b.amount, 0);
    const expense = financialRecords.filter(r => r.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);

    return {
      totalMembers,
      totalBookings,
      pendingBookings,
      incomeThisMonth: income,
      expenseThisMonth: expense,
    };
  }

  async getMembershipStats(tenantId: string) {
    const members = await prisma.member.findMany({
      where: { tenantId },
      select: { gender: true, birthDate: true }
    });

    const genderStats = { MALE: 0, FEMALE: 0 };
    const ageGroups = { '0-12': 0, '13-18': 0, '19-35': 0, '36-55': 0, '56+': 0 };

    const currentYear = new Date().getFullYear();

    members.forEach(m => {
      if (m.gender === 'M' || m.gender === 'MALE') genderStats.MALE++;
      else if (m.gender === 'F' || m.gender === 'FEMALE') genderStats.FEMALE++;

      if (m.birthDate) {
        const age = currentYear - m.birthDate.getFullYear();
        if (age <= 12) ageGroups['0-12']++;
        else if (age <= 18) ageGroups['13-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 55) ageGroups['36-55']++;
        else ageGroups['56+']++;
      }
    });

    return { genderStats, ageGroups, total: members.length };
  }

  async getAttendanceStats(tenantId: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { tenantId, createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } },
      orderBy: { createdAt: 'asc' },
      include: { worshipService: true }
    });

    const monthlyData: Record<string, { month: string; attendance: number }> = {};
    records.forEach(r => {
      const monthKey = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { month: monthKey, attendance: 0 };
      monthlyData[monthKey].attendance++;
    });

    return { trend: Object.values(monthlyData).map(m => ({ name: m.month, date: new Date(`${m.month}-01`).toISOString(), attendance: m.attendance })) };
  }

  async getFinancialStats(tenantId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const records = await prisma.financialRecord.findMany({
      where: { tenantId, date: { gte: sixMonthsAgo }, paymentStatus: 'COMPLETED' },
      orderBy: { date: 'asc' }
    });

    const monthlyData: Record<string, { month: string; income: number; expense: number }> = {};
    const categoryData: Record<string, number> = {};

    records.forEach(r => {
      const monthKey = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }
      
      if (r.type === 'OFFERING' || r.type === 'DONATION') {
        monthlyData[monthKey].income += r.amount;
      } else if (r.type === 'EXPENSE') {
        monthlyData[monthKey].expense += r.amount;
        if (r.category) {
          categoryData[r.category] = (categoryData[r.category] || 0) + r.amount;
        }
      }
    });

    return {
      trend: Object.values(monthlyData),
      expensesByCategory: Object.entries(categoryData).map(([name, value]) => ({ name, value }))
    };
  }

  async executeCustomReport(tenantId: string, module: ReportModule, config: any) {
    const selectConfig = config.columns.reduce((acc: any, col: string) => { acc[col] = true; return acc; }, {});
    if (Object.keys(selectConfig).length === 0) selectConfig.id = true;

    const whereClause: any = { tenantId };

    if (config.filters && Array.isArray(config.filters)) {
      config.filters.forEach((f: any) => {
        if (f.field && f.value !== undefined && f.value !== null && f.value !== '') {
          let fieldVal = f.value;
          
          if (f.field === 'gender') {
            const up = String(fieldVal).toUpperCase();
            if (up.startsWith('M') || up.includes('LAKI') || up.includes('MALE')) {
              fieldVal = 'M';
            } else if (up.startsWith('F') || up.startsWith('P') || up.includes('PEREMPUAN')) {
              fieldVal = 'F';
            }
          }
          
          if (f.field === 'category') {
            const up = String(fieldVal).toUpperCase();
            if (up.includes('YOUTH') || up.includes('REMAJA') || up.includes('PEMUDA')) {
              fieldVal = 'YOUTH';
            } else if (up.includes('CHILD') || up.includes('ANAK')) {
              fieldVal = 'CHILDREN';
            } else if (up.includes('ADULT') || up.includes('DEWASA') || up.includes('UMUM')) {
              fieldVal = 'ADULT';
            } else if (up.includes('ELDER') || up.includes('LANSIA')) {
              fieldVal = 'ELDERLY';
            }
          }

          if (f.operator === 'CONTAINS') {
            whereClause[f.field] = {
              contains: fieldVal,
              mode: 'insensitive'
            };
          } else {
            // EQUALS
            whereClause[f.field] = fieldVal;
          }
        }
      });
    }

    if (module === 'MEMBERSHIP') {
      return prisma.member.findMany({ where: whereClause, select: selectConfig });
    } else if (module === 'ATTENDANCE') {
      return prisma.attendanceRecord.findMany({ where: { tenantId }, include: { member: true, worshipService: true } });
    } else if (module === 'FINANCE') {
      const financeWhere: any = { tenantId };
      if (config.filters && Array.isArray(config.filters)) {
        config.filters.forEach((f: any) => {
          if (f.field && f.value !== undefined && f.value !== '') {
            if (f.operator === 'CONTAINS') {
              financeWhere[f.field] = { contains: f.value, mode: 'insensitive' };
            } else {
              if (f.field === 'amount') {
                financeWhere[f.field] = parseFloat(f.value);
              } else {
                financeWhere[f.field] = f.value;
              }
            }
          }
        });
      }
      return prisma.financialRecord.findMany({ where: financeWhere, select: selectConfig });
    }
    
    return [];
  }

  // --- Advanced Analytics (Fase 6 Part 2) ---

  async getGrowthAnalytics(tenantId: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 11);
    oneYearAgo.setDate(1); // Start of month 12 months ago

    const members = await prisma.member.findMany({
      where: { tenantId, createdAt: { gte: oneYearAgo } },
      select: { createdAt: true }
    });

    const monthlyData: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }

    members.forEach(m => {
      const key = `${m.createdAt.getFullYear()}-${String(m.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key]++;
      }
    });

    const trend = Object.entries(monthlyData).map(([month, newMembers]) => ({ month, newMembers }));
    
    // MoM Calculation
    const currentMonthData = trend[trend.length - 1].newMembers;
    const lastMonthData = trend[trend.length - 2].newMembers;
    const momGrowth = lastMonthData === 0 ? (currentMonthData > 0 ? 100 : 0) : ((currentMonthData - lastMonthData) / lastMonthData) * 100;

    return { trend, currentMonthNew: currentMonthData, momGrowth };
  }

  async getEngagementMetrics(tenantId: string) {
    const totalMembers = await prisma.member.count({ where: { tenantId, status: 'ACTIVE' } });
    if (totalMembers === 0) return { participationRate: 0, averageAttendance: 0, mobileMetrics: null };

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentServices = await prisma.worshipService.findMany({
      where: { tenantId },
      include: {
        attendance: { where: { createdAt: { gte: oneMonthAgo } } }
      }
    });

    // We count attendance records over the last month
    const totalAttendanceLastMonth = await prisma.attendanceRecord.count({
      where: { tenantId, createdAt: { gte: oneMonthAgo } }
    });

    // Approximate weekly services = ~4.3 weeks a month
    const averageWeeklyAttendance = Math.round(totalAttendanceLastMonth / 4.3);
    const participationRate = Math.min(100, Math.round((averageWeeklyAttendance / totalMembers) * 100));

    // --- Mobile App Analytics (Opsi B) ---
    const members = await prisma.member.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        category: true,
        passwordHash: true
      }
    });

    const totalPerCategory: Record<string, number> = { CHILDREN: 0, YOUTH: 0, ADULT: 0, ELDERLY: 0 };
    const registeredPerCategory: Record<string, number> = { CHILDREN: 0, YOUTH: 0, ADULT: 0, ELDERLY: 0 };
    members.forEach(m => {
      const cat = m.category || 'ADULT';
      totalPerCategory[cat] = (totalPerCategory[cat] || 0) + 1;
      if (m.passwordHash) {
        registeredPerCategory[cat] = (registeredPerCategory[cat] || 0) + 1;
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeLogs = await prisma.memberActivityLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        memberId: true,
        member: {
          select: {
            category: true
          }
        }
      }
    });

    const uniqueActiveMembersPerCategory: Record<string, Set<string>> = {
      CHILDREN: new Set<string>(),
      YOUTH: new Set<string>(),
      ADULT: new Set<string>(),
      ELDERLY: new Set<string>()
    };
    activeLogs.forEach(log => {
      if (log.member) {
        const cat = log.member.category || 'ADULT';
        if (uniqueActiveMembersPerCategory[cat]) {
          uniqueActiveMembersPerCategory[cat].add(log.memberId);
        }
      }
    });

    const activeCountPerCategory = {
      CHILDREN: uniqueActiveMembersPerCategory.CHILDREN.size,
      YOUTH: uniqueActiveMembersPerCategory.YOUTH.size,
      ADULT: uniqueActiveMembersPerCategory.ADULT.size,
      ELDERLY: uniqueActiveMembersPerCategory.ELDERLY.size,
    };

    return {
      participationRate,
      averageWeeklyAttendance,
      totalActiveMembers: totalMembers,
      mobileMetrics: {
        totalPerCategory,
        registeredPerCategory,
        activeCountPerCategory,
        totalRegisteredMobile: Object.values(registeredPerCategory).reduce((a, b) => a + b, 0),
        totalActiveMobile30d: Object.values(activeCountPerCategory).reduce((a, b) => a + b, 0)
      }
    };
  }

  async getFinancialAnalytics(tenantId: string) {
    const totalMembers = await prisma.member.count({ where: { tenantId, status: 'ACTIVE' } });
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const givingRecords = await prisma.financialRecord.findMany({
      where: { tenantId, date: { gte: sixMonthsAgo }, paymentStatus: 'COMPLETED', type: { in: ['OFFERING', 'DONATION'] } },
      select: { amount: true, date: true, memberId: true }
    });

    let totalGiving = 0;
    const uniqueGivers = new Set<string>();
    
    givingRecords.forEach(r => {
      totalGiving += r.amount;
      if (r.memberId) uniqueGivers.add(r.memberId);
    });

    const averageGivingPerCapita = totalMembers > 0 ? Math.round(totalGiving / totalMembers) : 0;
    
    // Givers percentage
    // NOTE: This assumes that financial records are correctly linked to memberId. If they are often anonymous, this will be low.
    const giverPercentage = totalMembers > 0 ? Math.round((uniqueGivers.size / totalMembers) * 100) : 0;

    return {
      averageGivingPerCapita,
      totalGivingLast6Months: totalGiving,
      giverPercentage
    };
  }

  async getBenchmarking(tenantId: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Attendance
    const currentMonthAttendance = await prisma.attendanceRecord.count({ where: { tenantId, createdAt: { gte: currentMonthStart } } });
    const lastMonthAttendance = await prisma.attendanceRecord.count({ where: { tenantId, createdAt: { gte: lastMonthStart, lt: currentMonthStart } } });

    // Growth
    const currentMonthMembers = await prisma.member.count({ where: { tenantId, createdAt: { gte: currentMonthStart } } });
    const lastMonthMembers = await prisma.member.count({ where: { tenantId, createdAt: { gte: lastMonthStart, lt: currentMonthStart } } });

    // Finance (Giving)
    const currentMonthGivingData = await prisma.financialRecord.aggregate({
      where: { tenantId, paymentStatus: 'COMPLETED', type: { in: ['OFFERING', 'DONATION'] }, date: { gte: currentMonthStart } },
      _sum: { amount: true }
    });
    const lastMonthGivingData = await prisma.financialRecord.aggregate({
      where: { tenantId, paymentStatus: 'COMPLETED', type: { in: ['OFFERING', 'DONATION'] }, date: { gte: lastMonthStart, lt: currentMonthStart } },
      _sum: { amount: true }
    });

    const currentGiving = currentMonthGivingData._sum.amount || 0;
    const lastGiving = lastMonthGivingData._sum.amount || 0;

    const calcMoM = (curr: number, last: number) => {
      if (last === 0) return curr > 0 ? 100 : 0;
      return ((curr - last) / last) * 100;
    };

    return {
      attendance: { current: currentMonthAttendance, last: lastMonthAttendance, mom: calcMoM(currentMonthAttendance, lastMonthAttendance) },
      growth: { current: currentMonthMembers, last: lastMonthMembers, mom: calcMoM(currentMonthMembers, lastMonthMembers) },
      finance: { current: currentGiving, last: lastGiving, mom: calcMoM(currentGiving, lastGiving) }
    };
  }

  // --- Report Templates ---
  async getTemplates(tenantId: string) {
    return prisma.reportTemplate.findMany({ where: { tenantId } });
  }

  async saveTemplate(tenantId: string, data: any) {
    const parsed = reportTemplateSchema.parse(data);
    return prisma.reportTemplate.create({
      data: { ...parsed, tenantId }
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    const t = await prisma.reportTemplate.findUnique({ where: { id } });
    if (!t || t.tenantId !== tenantId) throw new Error('Template tidak ditemukan');
    return prisma.reportTemplate.delete({ where: { id } });
  }
}
