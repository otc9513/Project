import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { requireFeature } from "@/lib/features/feature-flags";
import { reportRepository } from "../repository/report.repository";
import { reportPeriodSchema, type ReportPeriodInput } from "../schema/report.schema";

/**
 * التقارير المتقدمة (هذه الوحدة كاملة) محصورة بخطط Professional/Enterprise
 * فقط (feature flag "reports")، ومحصورة بأدوار الإدارة/المحاسبة - وفق
 * "SAAS BUSINESS MODEL" في المواصفات: كل عميل له ميزات مختلفة حسب خطته.
 */
const CAN_VIEW_REPORTS = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;

async function guard() {
  const ctx = await requireTenantContext();
  requireRole(ctx, [...CAN_VIEW_REPORTS]);
  await requireFeature(ctx.tenantId, "reports");
  return ctx;
}

/** يبني قائمة أشهر (سنة/شهر) المتقاطعة مع مدى [from, to] لبناء رسم بياني شهري */
function enumerateMonths(from: Date, to: Date): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  // حد أقصى 36 شهرًا (3 سنوات) لمنع طلب مدى ضخم يُنهك قاعدة البيانات
  let guardCount = 0;
  while (cursor <= end && guardCount < 36) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    guardCount += 1;
  }
  return months;
}

export interface FinancialSummaryReport {
  period: { from: Date; to: Date };
  totalRevenue: number;
  paymentsCount: number;
  totalExpenses: number;
  expensesCount: number;
  netProfit: number;
  invoices: {
    byStatus: Record<string, { count: number; amount: number; paidAmount: number }>;
  };
}

export interface RevenueAnalyticsReport {
  period: { from: Date; to: Date };
  monthly: Array<{ year: number; month: number; revenue: number }>;
  totalRevenue: number;
}

export interface ExpenseAnalyticsReport {
  period: { from: Date; to: Date };
  byCategory: Array<{ category: string; amount: number; count: number }>;
  totalExpenses: number;
}

export interface CollectionReport {
  period: { from: Date; to: Date };
  byCollector: Array<{ collectorId: string; collectorName: string; amount: number; paymentsCount: number }>;
  totalCollected: number;
}

export const reportService = {
  async financialSummary(rawPeriod: ReportPeriodInput): Promise<FinancialSummaryReport> {
    const ctx = await guard();
    const { from, to } = reportPeriodSchema.parse(rawPeriod);

    const [revenue, expenses, invoiceStatus] = await Promise.all([
      reportRepository.revenueInRange(ctx.tenantId, from, to),
      reportRepository.expensesInRange(ctx.tenantId, from, to),
      reportRepository.invoiceStatusInRange(ctx.tenantId, from, to),
    ]);

    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    const byStatus: FinancialSummaryReport["invoices"]["byStatus"] = {};
    for (const group of invoiceStatus) {
      byStatus[group.status] = {
        count: group._count,
        amount: Number(group._sum.amount ?? 0),
        paidAmount: Number(group._sum.paidAmount ?? 0),
      };
    }

    return {
      period: { from, to },
      totalRevenue,
      paymentsCount: revenue._count,
      totalExpenses,
      expensesCount: expenses._count,
      netProfit: totalRevenue - totalExpenses,
      invoices: { byStatus },
    };
  },

  async revenueAnalytics(rawPeriod: ReportPeriodInput): Promise<RevenueAnalyticsReport> {
    const ctx = await guard();
    const { from, to } = reportPeriodSchema.parse(rawPeriod);

    const months = enumerateMonths(from, to);
    const results = await Promise.all(
      months.map((m) => reportRepository.paymentsInSingleMonth(ctx.tenantId, m.year, m.month))
    );

    const monthly = months.map((m, idx) => ({
      year: m.year,
      month: m.month,
      revenue: Number(results[idx]?._sum.amount ?? 0),
    }));

    return {
      period: { from, to },
      monthly,
      totalRevenue: monthly.reduce((sum, m) => sum + m.revenue, 0),
    };
  },

  async expenseAnalytics(rawPeriod: ReportPeriodInput): Promise<ExpenseAnalyticsReport> {
    const ctx = await guard();
    const { from, to } = reportPeriodSchema.parse(rawPeriod);

    const groups = await reportRepository.expensesByCategory(ctx.tenantId, from, to);
    const byCategory = groups.map((g) => ({
      category: g.category,
      amount: Number(g._sum.amount ?? 0),
      count: g._count,
    }));

    return {
      period: { from, to },
      byCategory,
      totalExpenses: byCategory.reduce((sum, c) => sum + c.amount, 0),
    };
  },

  async collectionReport(rawPeriod: ReportPeriodInput): Promise<CollectionReport> {
    const ctx = await guard();
    const { from, to } = reportPeriodSchema.parse(rawPeriod);

    const byCollector = await reportRepository.collectionByCollector(ctx.tenantId, from, to);

    return {
      period: { from, to },
      byCollector,
      totalCollected: byCollector.reduce((sum, c) => sum + c.amount, 0),
    };
  },

  /**
   * التقرير الشامل المُستخدم في شاشة التقارير وفي التصدير (PDF/Excel):
   * يجمع الأقسام الأربعة عن نفس الفترة الزمنية باستدعاء واحد بدل أربعة
   * ذهابات منفصلة من الواجهة. الحراسة (requireFeature/requireRole) تُنفَّذ
   * مرة واحدة هنا فقط، والأقسام الفرعية تُبنى مباشرة من المستودع مباشرة
   * (وليس عبر استدعاء الدوال العامة أعلاه) لتفادي تكرار guard() أربع مرات.
   */
  async fullReport(rawPeriod: ReportPeriodInput) {
    const ctx = await guard();
    const { from, to } = reportPeriodSchema.parse(rawPeriod);

    const [revenue, expenses, invoiceStatus, expenseCategories, collectors, monthlyRevenue] =
      await Promise.all([
        reportRepository.revenueInRange(ctx.tenantId, from, to),
        reportRepository.expensesInRange(ctx.tenantId, from, to),
        reportRepository.invoiceStatusInRange(ctx.tenantId, from, to),
        reportRepository.expensesByCategory(ctx.tenantId, from, to),
        reportRepository.collectionByCollector(ctx.tenantId, from, to),
        Promise.all(
          enumerateMonths(from, to).map(async (m) => ({
            year: m.year,
            month: m.month,
            revenue: Number(
              (await reportRepository.paymentsInSingleMonth(ctx.tenantId, m.year, m.month))._sum
                .amount ?? 0
            ),
          }))
        ),
      ]);

    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    const byStatus: FinancialSummaryReport["invoices"]["byStatus"] = {};
    for (const group of invoiceStatus) {
      byStatus[group.status] = {
        count: group._count,
        amount: Number(group._sum.amount ?? 0),
        paidAmount: Number(group._sum.paidAmount ?? 0),
      };
    }

    const byCategory = expenseCategories.map((g) => ({
      category: g.category,
      amount: Number(g._sum.amount ?? 0),
      count: g._count,
    }));

    return {
      period: { from, to },
      financialSummary: {
        period: { from, to },
        totalRevenue,
        paymentsCount: revenue._count,
        totalExpenses,
        expensesCount: expenses._count,
        netProfit: totalRevenue - totalExpenses,
        invoices: { byStatus },
      } satisfies FinancialSummaryReport,
      revenueAnalytics: {
        period: { from, to },
        monthly: monthlyRevenue,
        totalRevenue: monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0),
      } satisfies RevenueAnalyticsReport,
      expenseAnalytics: {
        period: { from, to },
        byCategory,
        totalExpenses: byCategory.reduce((sum, c) => sum + c.amount, 0),
      } satisfies ExpenseAnalyticsReport,
      collectionReport: {
        period: { from, to },
        byCollector: collectors,
        totalCollected: collectors.reduce((sum, c) => sum + c.amount, 0),
      } satisfies CollectionReport,
    };
  },
};

export type FullReport = Awaited<ReturnType<typeof reportService.fullReport>>;
