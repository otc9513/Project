import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UnpaidSubscribersFilterInput } from "../schema/collection.schema";

export const collectionRepository = {
  /**
   * تسجيل دفعة وتحديث حالة الفاتورة ذريًا (Transaction) لمنع أي حالة تضارب
   * (سباق بين محصّلين اثنين على نفس الفاتورة، أو تحديث حالة يفوت مبلغًا مدفوعًا).
   * القفل هنا يعتمد على أن Postgres يعزل الصفوف تلقائيًا داخل transaction واحدة
   * عبر readCommitted + إعادة القراءة داخل نفس المعاملة.
   */
  async recordPayment(params: {
    tenantId: string;
    invoiceId: string;
    subscriberId: string;
    collectedById: string;
    amount: number;
    note?: string;
  }) {
    const { tenantId, invoiceId, subscriberId, collectedById, amount, note } = params;

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
      });
      if (!invoice) {
        throw new Error("الفاتورة غير موجودة أو لا تتبع مساحة العمل الحالية");
      }
      if (invoice.status === "CANCELLED") {
        throw new Error("لا يمكن تسجيل دفعة على فاتورة ملغاة");
      }
      if (invoice.status === "PAID") {
        throw new Error("الفاتورة مدفوعة بالكامل بالفعل");
      }

      const newPaidAmount = Number(invoice.paidAmount) + amount;
      const invoiceAmount = Number(invoice.amount);

      if (newPaidAmount > invoiceAmount) {
        throw new Error(
          `المبلغ المدفوع (${amount}) أكبر من المتبقي على الفاتورة (${invoiceAmount - Number(invoice.paidAmount)})`
        );
      }

      const newStatus =
        newPaidAmount >= invoiceAmount ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId,
          subscriberId,
          collectedById,
          amount,
          note,
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaidAmount, status: newStatus },
      });

      // إذا سُدِّدت الفاتورة بالكامل، وكان المشترك في حالة "متأخر بالدفع"،
      // نُعيده تلقائيًا لحالة "نشط" إن لم يكن لديه فواتير أخرى غير مسددة.
      if (newStatus === "PAID") {
        const remainingUnpaid = await tx.invoice.count({
          where: { subscriberId, status: { in: ["UNPAID", "PARTIAL"] } },
        });
        if (remainingUnpaid === 0) {
          await tx.subscriber.updateMany({
            where: { id: subscriberId, status: "DEBT" },
            data: { status: "ACTIVE" },
          });
        }
      }

      return payment;
    });
  },

  async findUnpaidSubscribers(tenantId: string, filter: UnpaidSubscribersFilterInput) {
    const where: Prisma.SubscriberWhereInput = {
      tenantId,
      invoices: { some: { status: { in: ["UNPAID", "PARTIAL"] } } },
      ...(filter.area ? { area: filter.area } : {}),
      ...(filter.search
        ? {
            OR: [
              { fullName: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        include: {
          invoices: {
            where: { status: { in: ["UNPAID", "PARTIAL"] } },
            orderBy: { dueDate: "asc" },
          },
        },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  },

  subscriberBalance(subscriberId: string) {
    return prisma.invoice.aggregate({
      where: { subscriberId, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { amount: true, paidAmount: true },
    });
  },

  paymentHistory(tenantId: string, subscriberId: string) {
    return prisma.payment.findMany({
      where: { tenantId, subscriberId },
      orderBy: { paidAt: "desc" },
    });
  },
};
