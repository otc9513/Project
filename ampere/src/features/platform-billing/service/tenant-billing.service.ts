import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { prisma } from "@/lib/prisma";
import { platformBillingRepository } from "../repository/platform-billing.repository";
import type { BillingCycle } from "@prisma/client";

/**
 * كل هذه الدوال مخصَّصة حصرًا لعرض/إجراء المستأجر الحالي نفسه - لا تأخذ
 * أبدًا tenantId كوسيط من الخارج (خلافًا لـ platform-billing.service.ts
 * المخصَّص لـ Super Admin والذي يقبل tenantId لأنه يحتاج الوصول لأي
 * مستأجر). راجع التعليق في context.ts حول ثغرة IDOR التي يمنعها هذا
 * الفصل المتعمَّد بين الخدمتين.
 */
export const tenantBillingService = {
  async getMySubscription() {
    const ctx = await requireTenantContext();
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      include: { plan: true },
    });

    return {
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      billingCycle: tenant.billingCycle,
      plan: tenant.plan,
    };
  },

  async listMyInvoices() {
    const ctx = await requireTenantContext();
    // pageSize=50: كافٍ لعرض كامل سجل فواتير SaaS لمستأجر واحد (فاتورة
    // شهرية واحدة كحد أقصى لكل دورة) - لا حاجة لترقيم صفحات هنا فعليًا.
    const result = await platformBillingRepository.findMany({
      tenantId: ctx.tenantId,
      page: 1,
      pageSize: 50,
    });
    return result.items;
  },

  /**
   * "تجديد الآن" - يُنشئ فاتورة SaaS جديدة يدفعها المستأجر خارج النظام
   * حاليًا (لا توجد بوابة دفع إلكتروني بعد - راجع القسم الأخير من هذه
   * المرحلة في README لتوضيح ذلك في الواجهة). محمي من التكرار: يرفض
   * الإنشاء إن كانت هناك فاتورة معلَّقة (UNPAID/OVERDUE) بالفعل بدل توليد
   * فاتورة ثانية متداخلة الفترة - قيد الفريد على مستوى قاعدة البيانات في
   * platform-billing.repository.ts مخصَّص لفواتير التجديد التلقائية من
   * Cron حصرًا (periodStart مختلف هنا: "الآن" وليس subscriptionEndsAt)
   * فلا يحمي هذه الحالة بذاته - هذا الفحص هو خط الدفاع الفعلي هنا.
   */
  async renewNow(billingCycle: BillingCycle) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);

    const existingOpenInvoice = await prisma.saasInvoice.findFirst({
      where: { tenantId: ctx.tenantId, status: { in: ["UNPAID", "OVERDUE"] } },
    });
    if (existingOpenInvoice) {
      throw new Error(
        "لديك فاتورة قيد الانتظار بالفعل - يرجى إتمام دفعها بدل إنشاء فاتورة جديدة"
      );
    }

    return platformBillingRepository.createForTenant(ctx.tenantId, billingCycle);
  },
};
