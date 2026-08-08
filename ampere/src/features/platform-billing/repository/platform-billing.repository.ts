import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma, type BillingCycle } from "@prisma/client";
import type { ListSaasInvoicesInput } from "../schema/platform-billing.schema";

// export: يتيح اختبار حساب فترة الفوترة مباشرة كدالة نقية (Pure Function)
// بلا حاجة لتمويه Prisma إطلاقًا - راجع __tests__/compute-period.test.ts
// (المرحلة 7 - أولوية عليا: "invoice period calculation" مذكورة صراحة).
export function computePeriod(periodStart: Date, billingCycle: BillingCycle) {
  const periodEnd = new Date(periodStart);
  if (billingCycle === "YEARLY") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  return periodEnd;
}

export const platformBillingRepository = {
  async findMany(input: ListSaasInvoicesInput) {
    const where: Prisma.SaasInvoiceWhereInput = {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.saasInvoice.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          plan: { select: { name: true, nameAr: true } },
          payments: true,
        },
        orderBy: { dueDate: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.saasInvoice.count({ where }),
    ]);

    return { items, total, page: input.page, pageSize: input.pageSize };
  },

  findById(id: string) {
    return prisma.saasInvoice.findUnique({
      where: { id },
      include: { tenant: true, plan: true, payments: { include: { recordedBy: true } } },
    });
  },

  async createForTenant(tenantId: string, billingCycle: BillingCycle) {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { plan: true },
    });

    const amount =
      billingCycle === "YEARLY"
        ? (tenant.plan.priceYearly ?? tenant.plan.priceMonthly.mul(12))
        : tenant.plan.priceMonthly;

    const periodStart = new Date();
    const periodEnd = computePeriod(periodStart, billingCycle);

    // نضبط دورة الفوترة على المستأجر نفسه هنا (وليس فقط على الفاتورة) حتى
    // تعرف مهمة الـ Cron لاحقًا أي دورة تجديد تلقائي تعتمد لهذا المستأجر
    // دون أن يُضطر مسؤول المنصة لاختيارها يدويًا في كل مرة.
    const [invoice] = await prisma.$transaction([
      prisma.saasInvoice.create({
        data: {
          tenantId,
          planId: tenant.planId,
          amount,
          billingCycle,
          periodStart,
          periodEnd,
          dueDate: periodEnd,
        },
      }),
      prisma.tenant.update({ where: { id: tenantId }, data: { billingCycle } }),
    ]);

    return invoice;
  },

  /**
   * توليد فاتورة تجديد تلقائية لمستأجر ACTIVE عند اقتراب/انتهاء دورته -
   * تُستدعى فقط من مهمة الـ Cron. آمنة للاستدعاء المتكرر (Idempotent):
   * تعتمد أولاً على فحص وجود فاتورة لنفس الفترة، وثانيًا (خط دفاع أخير
   * ضد التزامن) على القيد الفريد @@unique([tenantId, periodStart, periodEnd])
   * في قاعدة البيانات - فإن نجح الفحص الأول خطأً بسبب تشغيلين متزامنين،
   * سيرفض Postgres الإدخال المكرر ونلتقط الخطأ بهدوء دون تعطيل بقية الدفعة.
   */
  async createRenewalInvoiceIfDue(tenant: {
    id: string;
    billingCycle: BillingCycle | null;
    subscriptionEndsAt: Date | null;
  }) {
    if (!tenant.billingCycle) return { created: false as const, reason: "no_billing_cycle" as const };

    const full = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
      include: { plan: true },
    });

    const periodStart = tenant.subscriptionEndsAt ?? new Date();
    const periodEnd = computePeriod(periodStart, tenant.billingCycle);

    const existing = await prisma.saasInvoice.findFirst({
      where: { tenantId: tenant.id, periodStart, periodEnd },
      select: { id: true },
    });
    if (existing) return { created: false as const, reason: "already_exists" as const };

    const amount =
      tenant.billingCycle === "YEARLY"
        ? (full.plan.priceYearly ?? full.plan.priceMonthly.mul(12))
        : full.plan.priceMonthly;

    try {
      const invoice = await prisma.saasInvoice.create({
        data: {
          tenantId: tenant.id,
          planId: full.planId,
          amount,
          billingCycle: tenant.billingCycle,
          periodStart,
          periodEnd,
          dueDate: periodEnd,
        },
      });
      return { created: true as const, invoice };
    } catch (error) {
      // P2002 = انتهاك قيد التفرّد (تشغيل متزامن سبقنا لإنشاء نفس الفاتورة)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { created: false as const, reason: "already_exists" as const };
      }
      throw error;
    }
  },

  /**
   * تسجيل دفعة SaaS يدوية ضمن معاملة واحدة، بنفس نمط collection.service.ts
   * (تسجيل دفعة المشتركين): يمنع تجاوز المبلغ المتبقي ويحدّث حالة الفاتورة
   * ذريًّا حتى لا يحدث تعارض بين مسؤولَين ماليين يسجّلان دفعتين في وقت متقارب.
   */
  async recordPayment(params: {
    saasInvoiceId: string;
    amount: number;
    note?: string;
    paidAt?: Date;
    recordedById?: string;
    method?: string;
    // المرحلة 10: مُمرَّر فقط من webhook بوابة الدفع - راجع payment-service.ts
    providerRef?: string;
  }) {
    // Idempotency الـ webhook: إشعار مكرَّر لنفس العملية (providerRef) يُعيد
    // الدفعة الموجودة فعلاً بدل تسجيلها مرتين ومضاعفة تمديد الاشتراك.
    // فحص مسبق هنا (بالإضافة للقيد الفريد في قاعدة البيانات كخط دفاع أخير
    // ضد التزامن - نفس نمط createRenewalInvoiceIfDue أعلاه).
    if (params.providerRef) {
      const existing = await prisma.saasPayment.findUnique({
        where: { providerRef: params.providerRef },
      });
      if (existing) return existing;
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.saasInvoice.findUniqueOrThrow({
        where: { id: params.saasInvoiceId },
      });

      if (invoice.status === "CANCELLED") {
        throw new Error("لا يمكن تسجيل دفعة على فاتورة ملغاة");
      }

      const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
      if (params.amount > remaining + 0.001) {
        throw new Error(
          `المبلغ المُدخَل (${params.amount}) يتجاوز المتبقي على الفاتورة (${remaining})`
        );
      }

      const payment = await tx.saasPayment.create({
        data: {
          saasInvoiceId: params.saasInvoiceId,
          amount: params.amount,
          note: params.note,
          paidAt: params.paidAt ?? new Date(),
          recordedById: params.recordedById,
          method: params.method ?? "MANUAL",
          providerRef: params.providerRef,
        },
      });

      const newPaidAmount = Number(invoice.paidAmount) + params.amount;
      const isFullyPaid = newPaidAmount >= Number(invoice.amount);
      await tx.saasInvoice.update({
        where: { id: params.saasInvoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? "PAID" : "UNPAID",
        },
      });

      // الحلقة المفقودة سابقًا: عند اكتمال دفع فاتورة SaaS، امتد اشتراك
      // المستأجر تلقائيًا حتى نهاية الفترة المفوترة (وليس يدويًا عبر زر
      // "تمديد" منفصل كما كان الحال). لا نُقصّر الاشتراك أبدًا إن كان
      // تاريخ الانتهاء الحالي أبعد أصلاً (مثال: دفعة عن فترة سابقة متأخرة).
      if (isFullyPaid) {
        const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: invoice.tenantId } });
        if (tenant.status !== "SUSPENDED" && tenant.status !== "CANCELLED") {
          const newEnd =
            tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > invoice.periodEnd
              ? tenant.subscriptionEndsAt
              : invoice.periodEnd;
          await tx.tenant.update({
            where: { id: invoice.tenantId },
            data: { subscriptionEndsAt: newEnd, status: "ACTIVE" },
          });
        }
      }

      return payment;
    });
  },

  cancel(saasInvoiceId: string) {
    return prisma.saasInvoice.update({
      where: { id: saasInvoiceId },
      data: { status: "CANCELLED" },
    });
  },

  /** تُستدعى من مهمة صيانة دورية (راجع الملاحظة في service) لتعليم الفواتير المتأخرة. */
  markOverdue() {
    return prisma.saasInvoice.updateMany({
      where: { status: "UNPAID", dueDate: { lt: new Date() } },
      data: { status: "OVERDUE" },
    });
  },
};
