import "server-only";
import { requireTenantContext, requireRole, assertBelongsToTenant } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { amperePlanRepository, subscriptionRepository } from "../repository/subscription.repository";
import {
  createAmperePlanSchema,
  createSubscriptionSchema,
  changeSubscriptionSchema,
  type CreateAmperePlanInput,
  type CreateSubscriptionInput,
  type ChangeSubscriptionInput,
} from "../schema/subscription.schema";

const CAN_MANAGE = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;

export const amperePlanService = {
  async list() {
    const ctx = await requireTenantContext();
    return amperePlanRepository.findMany(ctx.tenantId);
  },

  async create(input: CreateAmperePlanInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);
    const data = createAmperePlanSchema.parse(input);
    return amperePlanRepository.create(ctx.tenantId, data);
  },
};

export const subscriptionService = {
  async getById(id: string) {
    const ctx = await requireTenantContext();
    const subscription = await subscriptionRepository.findById(ctx.tenantId, id);
    if (!subscription) throw new Error("الاشتراك غير موجود");
    return subscription;
  },

  async create(input: CreateSubscriptionInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_MANAGE]);

    const data = createSubscriptionSchema.parse(input);

    const amperePlan = await amperePlanRepository.findById(ctx.tenantId, data.amperePlanId);
    if (!amperePlan) throw new Error("خطة الأمبير غير موجودة");

    const existingActive = await subscriptionRepository.findActiveBySubscriber(
      ctx.tenantId,
      data.subscriberId
    );
    if (existingActive) {
      throw new Error("لدى هذا المشترك اشتراك نشط بالفعل — يجب إلغاؤه أو تعديله بدلاً من إنشاء اشتراك جديد");
    }

    const subscription = await subscriptionRepository.create(data);

    await recordAuditEntry({
      ctx,
      action: "subscription.created",
      entityType: "Subscription",
      entityId: subscription.id,
      changes: { after: data },
    });

    return subscription;
  },

  /**
   * تنفيذ قاعدة العمل الإلزامية: أي تغيير أمبير/سعر يُحفظ في سجل تاريخي
   * (SubscriptionHistory) مع تاريخ التغيير والمستخدم الذي نفّذه، قبل تطبيق
   * القيمة الجديدة — وذلك ضمن معاملة واحدة (transaction) في طبقة الـ repository
   * لضمان عدم انفصال التعديل عن سجله التاريخي.
   */
  async change(input: ChangeSubscriptionInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_MANAGE]);

    const data = changeSubscriptionSchema.parse(input);
    const subscription = await subscriptionRepository.findById(ctx.tenantId, data.subscriptionId);
    if (!subscription) throw new Error("الاشتراك غير موجود");
    assertBelongsToTenant(ctx, subscription.subscriber.tenantId);

    const updated = await subscriptionRepository.applyChange(ctx.tenantId, {
      subscriptionId: data.subscriptionId,
      changedById: ctx.userId,
      current: {
        amperePlanId: subscription.amperePlanId,
        monthlyPrice: Number(subscription.monthlyPrice),
        currentAmpere: Number(subscription.amperePlan.ampere),
      },
      newAmperePlanId: data.newAmperePlanId,
      newMonthlyPrice: data.newMonthlyPrice,
    });

    await recordAuditEntry({
      ctx,
      action: "subscription.changed",
      entityType: "Subscription",
      entityId: data.subscriptionId,
      changes: {
        before: {
          amperePlanId: subscription.amperePlanId,
          monthlyPrice: subscription.monthlyPrice,
        },
        after: {
          amperePlanId: data.newAmperePlanId ?? subscription.amperePlanId,
          monthlyPrice: data.newMonthlyPrice ?? subscription.monthlyPrice,
        },
      },
    });

    return updated;
  },

  async history(subscriptionId: string) {
    const ctx = await requireTenantContext();
    return subscriptionRepository.history(ctx.tenantId, subscriptionId);
  },
};
