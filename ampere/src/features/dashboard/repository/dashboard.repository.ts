import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * طبقة الوصول للبيانات المجمّعة للوحة التحكم. كل دالة مستقلة ومعزولة بـ tenantId
 * (نفس القاعدة الذهبية في بقية الوحدات) ولا تُستدعى إلا من dashboard.service.ts.
 * الاستعلامات هنا للقراءة فقط (Read-only) وتُصمَّم لتنفَّذ بالتوازي عبر Promise.all
 * في طبقة الخدمة لتقليل زمن استجابة الشاشة الأكثر زيارة في التطبيق.
 */
export const dashboardRepository = {
  subscriberCounts(tenantId: string) {
    return prisma.subscriber.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });
  },

  generatorCounts(tenantId: string) {
    return prisma.generator.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });
  },

  activeSubscriptionsCount(tenantId: string) {
    return prisma.subscription.count({
      where: { status: "ACTIVE", subscriber: { tenantId } },
    });
  },

  async invoiceSummary(tenantId: string, month: number, year: number) {
    const groups = await prisma.invoice.groupBy({
      by: ["status"],
      where: { tenantId, month, year },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    return groups.reduce(
      (acc, g) => {
        acc.byStatus[g.status] = {
          count: g._count,
          amount: Number(g._sum.amount ?? 0),
          paidAmount: Number(g._sum.paidAmount ?? 0),
        };
        return acc;
      },
      { byStatus: {} as Record<string, { count: number; amount: number; paidAmount: number }> }
    );
  },

  collectedInPeriod(tenantId: string, from: Date, to: Date) {
    return prisma.payment.aggregate({
      where: { tenantId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
  },

  expensesInPeriod(tenantId: string, from: Date, to: Date) {
    return prisma.expense.aggregate({
      where: { tenantId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  },

  expensesByCategory(tenantId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ["category"],
      where: { tenantId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  },

  async fuelStatus(tenantId: string, from: Date, to: Date) {
    const [purchased, used] = await Promise.all([
      prisma.fuelPurchase.aggregate({
        where: { tenantId, date: { gte: from, lte: to } },
        _sum: { quantityLiters: true, price: true },
      }),
      prisma.fuelUsage.aggregate({
        where: { tenantId, date: { gte: from, lte: to } },
        _sum: { quantityLiters: true },
      }),
    ]);

    return {
      purchasedLiters: Number(purchased._sum.quantityLiters ?? 0),
      purchaseCost: Number(purchased._sum.price ?? 0),
      usedLiters: Number(used._sum.quantityLiters ?? 0),
    };
  },

  maintenanceAlerts(tenantId: string, windowDays: number) {
    const upperBound = new Date();
    upperBound.setDate(upperBound.getDate() + windowDays);
    return prisma.maintenanceRecord.findMany({
      where: { tenantId, nextDueDate: { not: null, gte: new Date(), lte: upperBound } },
      include: { generator: { select: { name: true } } },
      orderBy: { nextDueDate: "asc" },
      take: 10,
    });
  },

  openFaults(tenantId: string) {
    return prisma.fault.findMany({
      where: { tenantId, status: { in: ["NEW", "IN_PROGRESS"] } },
      include: { generator: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 10,
    });
  },

  openFaultsCount(tenantId: string) {
    return prisma.fault.count({
      where: { tenantId, status: { in: ["NEW", "IN_PROGRESS"] } },
    });
  },
};
