import "server-only";
import { prisma } from "@/lib/prisma";

export const reportRepository = {
  revenueInRange(tenantId: string, from: Date, to: Date) {
    return prisma.payment.aggregate({
      where: { tenantId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
  },

  expensesInRange(tenantId: string, from: Date, to: Date) {
    return prisma.expense.aggregate({
      where: { tenantId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
  },

  expensesByCategory(tenantId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ["category"],
      where: { tenantId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });
  },

  invoiceStatusInRange(tenantId: string, from: Date, to: Date) {
    return prisma.invoice.groupBy({
      by: ["status"],
      where: { tenantId, dueDate: { gte: from, lte: to } },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });
  },

  async collectionByCollector(tenantId: string, from: Date, to: Date) {
    const groups = await prisma.payment.groupBy({
      by: ["collectedById"],
      where: { tenantId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });

    if (groups.length === 0) return [];

    const collectors = await prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.collectedById) } },
      select: { id: true, name: true, email: true },
    });
    const collectorById = new Map(collectors.map((c) => [c.id, c]));

    return groups.map((g) => ({
      collectorId: g.collectedById,
      collectorName: collectorById.get(g.collectedById)?.name ?? collectorById.get(g.collectedById)?.email ?? "غير معروف",
      amount: Number(g._sum.amount ?? 0),
      paymentsCount: g._count,
    }));
  },

  paymentsInSingleMonth(tenantId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    return prisma.payment.aggregate({
      where: { tenantId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  },
};
