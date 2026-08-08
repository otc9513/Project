import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, TenantStatus } from "@prisma/client";
import type { ListTenantsInput } from "../schema/platform-tenant.schema";

/**
 * طبقة وصول بيانات لوحة Super Admin لإدارة المستأجرين. على عكس بقية
 * repositories في المشروع (التي تُلزَم دائمًا بـ tenantId كخط دفاع IDOR)،
 * هذه الطبقة تُستدعى فقط من خدمة تتحقق مسبقًا من `requirePlatformAdmin()`
 * - أي أنها الوحيدة في المشروع المسموح لها شرعًا برؤية كل المستأجرين معًا.
 */
export const platformTenantRepository = {
  async findMany(input: ListTenantsInput) {
    const where: Prisma.TenantWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.planId ? { planId: input.planId } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { slug: { contains: input.search, mode: "insensitive" } },
              { contactPhone: { contains: input.search, mode: "insensitive" } },
              {
                memberships: {
                  some: {
                    role: "OWNER",
                    user: { email: { contains: input.search, mode: "insensitive" } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, nameAr: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { name: true, email: true } } },
          },
          _count: { select: { subscribers: true, memberships: true, generators: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.tenant.count({ where }),
    ]);

    return { items, total, page: input.page, pageSize: input.pageSize };
  },

  findById(tenantId: string) {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        memberships: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
        _count: {
          select: {
            subscribers: true,
            generators: true,
            invoices: true,
            payments: true,
            memberships: true,
          },
        },
      },
    });
  },

  async platformOverview() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      expiredTenants,
      suspendedTenants,
      newLast30Days,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.count({ where: { status: "TRIAL" } }),
      prisma.tenant.count({ where: { status: "EXPIRED" } }),
      prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      prisma.tenant.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // MRR: نجمع priceMonthly للمستأجرين النشطين فقط (Trial/Expired/Suspended
    // لا تُحتسَب كإيراد متكرر فعلي).
    const activeTenantsWithPlan = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { plan: { select: { priceMonthly: true } } },
    });
    const mrr = activeTenantsWithPlan.reduce(
      (sum, t) => sum + Number(t.plan.priceMonthly),
      0
    );

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      expiredTenants,
      suspendedTenants,
      newLast30Days,
      mrr,
    };
  },

  async updateStatus(
    tenantId: string,
    status: TenantStatus,
    extra?: { suspendedAt?: Date | null; suspensionReason?: string | null }
  ) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: { status, ...extra },
    });
  },

  async extendSubscription(tenantId: string, days: number) {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const base =
      tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > new Date()
        ? tenant.subscriptionEndsAt
        : new Date();
    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionEndsAt: newDate,
        // تمديد الاشتراك يُعيد المستأجر تلقائيًا لحالة ACTIVE إن كان
        // EXPIRED أو TRIAL - وهو بالضبط سلوك "التجديد" المطلوب في المواصفات.
        status: tenant.status === "SUSPENDED" || tenant.status === "CANCELLED" ? tenant.status : "ACTIVE",
      },
    });
  },

  changePlan(tenantId: string, planId: string) {
    return prisma.tenant.update({ where: { id: tenantId }, data: { planId } });
  },

  async setFeatureOverride(tenantId: string, featureKey: string, value: boolean | null) {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const overrides = { ...(tenant.featureOverrides as Record<string, boolean>) };

    if (value === null) {
      delete overrides[featureKey];
    } else {
      overrides[featureKey] = value;
    }

    return prisma.tenant.update({
      where: { id: tenantId },
      data: { featureOverrides: overrides },
    });
  },

  /**
   * مستأجرو TRIAL الذين تجاوز تاريخ انتهاء تجربتهم الآن. يُستدعى فقط من
   * مهمة Cron دورة حياة الاشتراك (راجع billing-cron.service.ts).
   */
  findExpiredTrials() {
    return prisma.tenant.findMany({
      where: { status: "TRIAL", trialEndsAt: { lt: new Date() } },
      select: { id: true, name: true },
    });
  },

  /**
   * مستأجرو ACTIVE الذين تجاوز تاريخ انتهاء اشتراكهم المدفوع الآن دون
   * تجديد (لا يوجد استدعاء لـ extendSubscription منذ ذلك الحين).
   */
  findExpiredActiveSubscriptions() {
    return prisma.tenant.findMany({
      where: { status: "ACTIVE", subscriptionEndsAt: { lt: new Date() } },
      select: { id: true, name: true },
    });
  },

  /**
   * مستأجرو ACTIVE الذين لديهم دورة فوترة معروفة (billingCycle) واقترب
   * أو حان موعد تجديد اشتراكهم، ليتم توليد فاتورة الدورة القادمة تلقائيًا
   * قبل الانتهاء الفعلي (بفارق renewalLeadDays) حتى تتاح فرصة الدفع قبل
   * توقف الخدمة. مستأجرو الخطة المجانية (billingCycle=null) مُستبعَدون
   * تلقائيًا لأنه لا معنى لتوليد فاتورة بقيمة 0.
   */
  findTenantsDueForRenewalInvoice(renewalLeadDays: number) {
    const horizon = new Date(Date.now() + renewalLeadDays * 24 * 60 * 60 * 1000);
    return prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
        billingCycle: { not: null },
        subscriptionEndsAt: { not: null, lt: horizon },
      },
      select: { id: true, name: true, billingCycle: true, subscriptionEndsAt: true },
    });
  },

  setBillingCycle(tenantId: string, billingCycle: "MONTHLY" | "YEARLY") {
    return prisma.tenant.update({ where: { id: tenantId }, data: { billingCycle } });
  },

  delete(tenantId: string) {
    // onDelete: Cascade معرَّف على كل العلاقات المرتبطة بـ Tenant في
    // schema.prisma، فحذف السجل هنا يحذف تلقائيًا كل بيانات المستأجر
    // (مشتركون/فواتير/دفعات...). هذا فعل نهائي غير قابل للتراجع.
    return prisma.tenant.delete({ where: { id: tenantId } });
  },
};
