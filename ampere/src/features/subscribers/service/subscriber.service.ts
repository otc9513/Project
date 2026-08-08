import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { subscriberRepository } from "../repository/subscriber.repository";
import {
  createSubscriberSchema,
  updateSubscriberSchema,
  subscriberFilterSchema,
  type CreateSubscriberInput,
  type UpdateSubscriberInput,
  type SubscriberFilterInput,
} from "../schema/subscriber.schema";

/**
 * الأدوار المسموح لها بإنشاء/تعديل بيانات المشتركين: OWNER, ADMIN, ACCOUNTANT.
 * COLLECTOR يمكنه فقط العرض (يُستخدم في وحدة التحصيل المنفصلة لتسجيل الدفعات).
 * TECHNICIAN لا صلاحية له هنا إطلاقًا.
 */
const CAN_MANAGE_SUBSCRIBERS = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;

export const subscriberService = {
  async list(rawFilter: Partial<SubscriberFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = subscriberFilterSchema.parse(rawFilter);
    return subscriberRepository.findMany(ctx.tenantId, filter);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const subscriber = await subscriberRepository.findById(ctx.tenantId, id);
    if (!subscriber) {
      throw new Error("المشترك غير موجود");
    }
    return subscriber;
  },

  async create(input: CreateSubscriberInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_MANAGE_SUBSCRIBERS]);

    const data = createSubscriberSchema.parse(input);

    const existing = await subscriberRepository.findByPhone(ctx.tenantId, data.phone);
    if (existing) {
      throw new Error("يوجد مشترك آخر مسجّل بنفس رقم الهاتف");
    }

    const subscriber = await subscriberRepository.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "subscriber.created",
      entityType: "Subscriber",
      entityId: subscriber.id,
      changes: { after: data },
    });

    return subscriber;
  },

  async update(input: UpdateSubscriberInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_MANAGE_SUBSCRIBERS]);

    const data = updateSubscriberSchema.parse(input);
    const before = await subscriberRepository.findById(ctx.tenantId, data.id);
    if (!before) {
      throw new Error("المشترك غير موجود");
    }

    const subscriber = await subscriberRepository.update(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "subscriber.updated",
      entityType: "Subscriber",
      entityId: subscriber.id,
      changes: { before, after: subscriber },
    });

    return subscriber;
  },

  async archive(id: string) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_MANAGE_SUBSCRIBERS]);

    await subscriberRepository.archive(ctx.tenantId, id);

    await recordAuditEntry({
      ctx,
      action: "subscriber.archived",
      entityType: "Subscriber",
      entityId: id,
    });
  },

  async statusBreakdown() {
    const ctx = await requireTenantContext();
    return subscriberRepository.countByStatus(ctx.tenantId);
  },
};
