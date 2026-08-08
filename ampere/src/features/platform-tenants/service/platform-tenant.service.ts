import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { platformTenantRepository } from "../repository/platform-tenant.repository";
import {
  listTenantsSchema,
  suspendTenantSchema,
  activateTenantSchema,
  cancelTenantSchema,
  extendSubscriptionSchema,
  changeTenantPlanSchema,
  setFeatureOverrideSchema,
  type ListTenantsInput,
  type SuspendTenantInput,
  type ActivateTenantInput,
  type CancelTenantInput,
  type ExtendSubscriptionInput,
  type ChangeTenantPlanInput,
  type SetFeatureOverrideInput,
} from "../schema/platform-tenant.schema";

/**
 * صلاحيات القراءة: SUPER_ADMIN و SUPPORT_ADMIN و FINANCE_ADMIN جميعًا
 * يمكنهم عرض المستأجرين (يحتاجه الدعم والمحاسبة للاطلاع). أما التعليق/
 * الحذف/تغيير الخطة فمحصورة حسب الدور تحديدًا في كل دالة أدناه.
 */
export const platformTenantService = {
  async overview() {
    await requirePlatformAdmin();
    return platformTenantRepository.platformOverview();
  },

  async list(input: ListTenantsInput) {
    await requirePlatformAdmin();
    const data = listTenantsSchema.parse(input);
    return platformTenantRepository.findMany(data);
  },

  async getById(tenantId: string) {
    await requirePlatformAdmin();
    const tenant = await platformTenantRepository.findById(tenantId);
    if (!tenant) throw new Error("المستأجر غير موجود");
    return tenant;
  },

  /** التعليق: متاح لـ SUPER_ADMIN و SUPPORT_ADMIN (إدارة يومية للحسابات المتعثرة). */
  async suspend(input: SuspendTenantInput) {
    const ctx = await requirePlatformAdmin(["SUPER_ADMIN", "SUPPORT_ADMIN"]);
    const data = suspendTenantSchema.parse(input);

    const tenant = await platformTenantRepository.updateStatus(data.tenantId, "SUSPENDED", {
      suspendedAt: new Date(),
      suspensionReason: data.reason,
    });

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.suspended",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
      changes: { after: { reason: data.reason } },
    });

    return tenant;
  },

  async activate(input: ActivateTenantInput) {
    const ctx = await requirePlatformAdmin(["SUPER_ADMIN", "SUPPORT_ADMIN"]);
    const data = activateTenantSchema.parse(input);

    const tenant = await platformTenantRepository.updateStatus(data.tenantId, "ACTIVE", {
      suspendedAt: null,
      suspensionReason: null,
    });

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.activated",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
    });

    return tenant;
  },

  /** الإلغاء نهائي على مستوى الحالة (لكن ليس حذفًا للبيانات) - SUPER_ADMIN فقط. */
  async cancel(input: CancelTenantInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);
    const data = cancelTenantSchema.parse(input);

    const tenant = await platformTenantRepository.updateStatus(data.tenantId, "CANCELLED", {
      suspensionReason: data.reason,
    });

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.cancelled",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
      changes: { after: { reason: data.reason } },
    });

    return tenant;
  },

  /** الحذف الفعلي (Cascade على كل البيانات) - SUPER_ADMIN فقط، ولا رجعة عنه. */
  async delete(tenantId: string) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);
    // حذف نهائي بلا رجعة - حد صارم يمنع حذفًا جماعيًا سريعًا بالخطأ أو
    // بحساب مُخترَق (5 عمليات حذف كحد أقصى كل ساعة لكل مسؤول).
    await checkRateLimit(`tenant-delete:${ctx.userId}`, 5, 60 * 60 * 1000);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.deleted",
      entityType: "Tenant",
      entityId: tenantId,
      targetTenantId: undefined, // المستأجر سيُحذف فعليًا؛ لا نُبقي مرجعًا معلّقًا إليه
    });

    await platformTenantRepository.delete(tenantId);
  },

  /** التمديد: متاح أيضًا لـ FINANCE_ADMIN لأنه إجراء مالي بحت (تجديد اشتراك). */
  async extendSubscription(input: ExtendSubscriptionInput) {
    const ctx = await requirePlatformAdmin(["SUPER_ADMIN", "FINANCE_ADMIN"]);
    const data = extendSubscriptionSchema.parse(input);

    const tenant = await platformTenantRepository.extendSubscription(data.tenantId, data.days);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.subscription_extended",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
      changes: { after: { days: data.days, newExpiry: tenant.subscriptionEndsAt } },
    });

    return tenant;
  },

  async changePlan(input: ChangeTenantPlanInput) {
    const ctx = await requirePlatformAdmin(["SUPER_ADMIN"]);
    const data = changeTenantPlanSchema.parse(input);

    const before = await platformTenantRepository.findById(data.tenantId);
    const tenant = await platformTenantRepository.changePlan(data.tenantId, data.planId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.plan_changed",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
      changes: { before: { planId: before?.planId }, after: { planId: data.planId } },
    });

    return tenant;
  },

  async setFeatureOverride(input: SetFeatureOverrideInput) {
    const ctx = await requirePlatformAdmin(["SUPER_ADMIN"]);
    const data = setFeatureOverrideSchema.parse(input);

    const tenant = await platformTenantRepository.setFeatureOverride(
      data.tenantId,
      data.featureKey,
      data.value
    );

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.tenant.feature_override_changed",
      entityType: "Tenant",
      entityId: data.tenantId,
      targetTenantId: data.tenantId,
      changes: { after: { featureKey: data.featureKey, value: data.value } },
    });

    return tenant;
  },
};
