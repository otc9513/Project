import "server-only";
import type { Role } from "@prisma/client";
import { requireTenantContext } from "@/lib/tenant/context";
import { dashboardRepository } from "../repository/dashboard.repository";
import { dashboardPeriodSchema, type DashboardPeriodInput } from "../schema/dashboard.schema";

const FINANCIAL_ROLES: Role[] = ["OWNER", "ADMIN", "ACCOUNTANT"];
const COLLECTION_ROLES: Role[] = ["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR"];
const OPERATIONS_ROLES: Role[] = ["OWNER", "ADMIN", "TECHNICIAN"];
const FUEL_ROLES: Role[] = ["OWNER", "ADMIN", "ACCOUNTANT", "TECHNICIAN"];
const NET_PROFIT_ROLES: Role[] = ["OWNER", "ADMIN"];

function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export interface DashboardSummary {
  period: { month: number; year: number };
  generators?: { total: number; operational: number; underMaintenance: number; offline: number };
  subscribers?: { total: number; active: number; suspended: number; cancelled: number; debt: number };
  activeSubscriptions?: number;
  billing?: {
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
    totalRevenue: number;
    totalOutstanding: number;
  };
  collection?: { collectedAmount: number; paymentsCount: number };
  expenses?: { total: number; byCategory: Record<string, number> };
  netProfit?: number;
  fuel?: { purchasedLiters: number; purchaseCost: number; usedLiters: number };
  maintenanceAlerts?: Array<{
    id: string;
    type: string;
    nextDueDate: Date | null;
    generator: { name: string };
  }>;
  faultAlerts?: {
    openCount: number;
    items: Array<{ id: string; title: string; priority: string; generator: { name: string } }>;
  };
}

/**
 * تجميع بيانات لوحة التحكم. كل قسم يُبنى فقط إذا كان دور المستخدم الحالي
 * مصرَّحًا له بالاطّلاع عليه - وليس فقط "مخفيًا" في الواجهة. هذا خط دفاع
 * أمني حقيقي: لا تُنفَّذ الاستعلامات المالية أصلًا لمستخدم لا يملك صلاحيتها
 * (مثال: فني الصيانة لا يرى الإيرادات ولا صافي الربح إطلاقًا).
 */
export const dashboardService = {
  async getSummary(rawFilter: Partial<DashboardPeriodInput> = {}): Promise<DashboardSummary> {
    const ctx = await requireTenantContext();
    const filter = dashboardPeriodSchema.parse(rawFilter);

    const now = new Date();
    const year = filter.year ?? now.getFullYear();
    const month = filter.month ?? now.getMonth() + 1;
    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);

    const summary: DashboardSummary = { period: { month, year } };

    const tasks: Array<Promise<void>> = [];

    if (OPERATIONS_ROLES.includes(ctx.role)) {
      tasks.push(
        dashboardRepository.generatorCounts(ctx.tenantId).then((groups) => {
          const counts = { total: 0, operational: 0, underMaintenance: 0, offline: 0 };
          for (const g of groups) {
            counts.total += g._count;
            if (g.status === "OPERATIONAL") counts.operational = g._count;
            if (g.status === "UNDER_MAINTENANCE") counts.underMaintenance = g._count;
            if (g.status === "OFFLINE") counts.offline = g._count;
          }
          summary.generators = counts;
        })
      );
    }

    if (COLLECTION_ROLES.includes(ctx.role)) {
      tasks.push(
        dashboardRepository.subscriberCounts(ctx.tenantId).then((groups) => {
          const counts = { total: 0, active: 0, suspended: 0, cancelled: 0, debt: 0 };
          for (const g of groups) {
            counts.total += g._count;
            if (g.status === "ACTIVE") counts.active = g._count;
            if (g.status === "SUSPENDED") counts.suspended = g._count;
            if (g.status === "CANCELLED") counts.cancelled = g._count;
            if (g.status === "DEBT") counts.debt = g._count;
          }
          summary.subscribers = counts;
        })
      );
      tasks.push(
        dashboardRepository.activeSubscriptionsCount(ctx.tenantId).then((count) => {
          summary.activeSubscriptions = count;
        })
      );
      tasks.push(
        dashboardRepository.collectedInPeriod(ctx.tenantId, from, to).then((agg) => {
          summary.collection = {
            collectedAmount: Number(agg._sum.amount ?? 0),
            paymentsCount: agg._count,
          };
        })
      );
    }

    if (FINANCIAL_ROLES.includes(ctx.role)) {
      tasks.push(
        dashboardRepository.invoiceSummary(ctx.tenantId, month, year).then((result) => {
          const paid = result.byStatus.PAID ?? { count: 0, amount: 0, paidAmount: 0 };
          const unpaid = result.byStatus.UNPAID ?? { count: 0, amount: 0, paidAmount: 0 };
          const partial = result.byStatus.PARTIAL ?? { count: 0, amount: 0, paidAmount: 0 };
          const totalRevenue = paid.paidAmount + unpaid.paidAmount + partial.paidAmount;
          const totalOutstanding =
            unpaid.amount - unpaid.paidAmount + (partial.amount - partial.paidAmount);
          summary.billing = {
            paidCount: paid.count,
            unpaidCount: unpaid.count,
            partialCount: partial.count,
            totalRevenue,
            totalOutstanding,
          };
        })
      );
      // ملاحظة هندسية: يُجمَع الإجمالي والتوزيع حسب الفئة في مهمة واحدة (وليس
      // مهمتين منفصلتين) لأن كلتيهما تكتبان إلى `summary.expenses` نفسه - لو
      // نُفِّذتا كـ tasks مستقلة ضمن Promise.all لكانت النتيجة عرضة لتضارب
      // ترتيب الاكتمال (Race Condition) حيث تمحو إحداهما نتيجة الأخرى.
      tasks.push(
        Promise.all([
          dashboardRepository.expensesInPeriod(ctx.tenantId, from, to),
          dashboardRepository.expensesByCategory(ctx.tenantId, from, to),
        ]).then(([totalAgg, groups]) => {
          const byCategory: Record<string, number> = {};
          for (const g of groups) {
            byCategory[g.category] = Number(g._sum.amount ?? 0);
          }
          summary.expenses = { total: Number(totalAgg._sum.amount ?? 0), byCategory };
        })
      );
    }

    if (FUEL_ROLES.includes(ctx.role)) {
      tasks.push(
        dashboardRepository.fuelStatus(ctx.tenantId, from, to).then((fuel) => {
          summary.fuel = fuel;
        })
      );
    }

    if (OPERATIONS_ROLES.includes(ctx.role)) {
      tasks.push(
        dashboardRepository
          .maintenanceAlerts(ctx.tenantId, filter.maintenanceWindowDays)
          .then((records) => {
            summary.maintenanceAlerts = records;
          })
      );
    }

    if (COLLECTION_ROLES.includes(ctx.role) || OPERATIONS_ROLES.includes(ctx.role)) {
      tasks.push(
        Promise.all([
          dashboardRepository.openFaultsCount(ctx.tenantId),
          dashboardRepository.openFaults(ctx.tenantId),
        ]).then(([openCount, items]) => {
          summary.faultAlerts = { openCount, items };
        })
      );
    }

    await Promise.all(tasks);

    // صافي الربح يُحسب بعد اكتمال كل من الإيرادات والمصاريف، ومحصور بأعلى
    // مستويين إداريين فقط (حتى المحاسب لا يراه هنا افتراضيًا، تماشيًا مع
    // مبدأ "أقل صلاحية ممكنة" لبيانات الربحية الحساسة).
    if (NET_PROFIT_ROLES.includes(ctx.role) && summary.billing && summary.expenses) {
      summary.netProfit = summary.billing.totalRevenue - summary.expenses.total;
    }

    return summary;
  },
};
