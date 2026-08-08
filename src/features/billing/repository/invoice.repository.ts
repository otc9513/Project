import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InvoiceFilterInput } from "../schema/billing.schema";

export const invoiceRepository = {
  /**
   * كل المشتركين النشطين الذين لديهم اشتراك فعّال ولم تُصدَر لهم فاتورة
   * لهذا الشهر/السنة بعد - تُستخدم في التوليد الجماعي للفواتير الشهرية.
   */
  findSubscribersDueForInvoice(tenantId: string, month: number, year: number) {
    return prisma.subscriber.findMany({
      where: {
        tenantId,
        status: { in: ["ACTIVE", "DEBT"] },
        subscriptions: { some: { status: "ACTIVE" } },
        invoices: { none: { month, year } },
      },
      include: {
        subscriptions: { where: { status: "ACTIVE" }, take: 1 },
      },
    });
  },

  createMany(invoices: Prisma.InvoiceCreateManyInput[]) {
    return prisma.invoice.createMany({ data: invoices, skipDuplicates: true });
  },

  create(data: Prisma.InvoiceUncheckedCreateInput) {
    return prisma.invoice.create({ data });
  },

  existsForPeriod(subscriberId: string, month: number, year: number) {
    return prisma.invoice.findUnique({
      where: { subscriberId_month_year: { subscriberId, month, year } },
    });
  },

  async findMany(tenantId: string, filter: InvoiceFilterInput) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.month ? { month: filter.month } : {}),
      ...(filter.year ? { year: filter.year } : {}),
      ...(filter.subscriberId ? { subscriberId: filter.subscriberId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { subscriber: { select: { fullName: true, phone: true } } },
        orderBy: { dueDate: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  },

  findById(tenantId: string, id: string) {
    return prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        subscriber: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    });
  },

  async cancel(tenantId: string, id: string) {
    const result = await prisma.invoice.updateMany({
      where: { id, tenantId, status: { not: "PAID" } },
      data: { status: "CANCELLED" },
    });
    if (result.count === 0) {
      throw new Error("لا يمكن إلغاء الفاتورة (غير موجودة أو مدفوعة بالكامل بالفعل)");
    }
  },

  summaryTotals(tenantId: string, month: number, year: number) {
    return prisma.invoice.groupBy({
      by: ["status"],
      where: { tenantId, month, year },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });
  },
};
