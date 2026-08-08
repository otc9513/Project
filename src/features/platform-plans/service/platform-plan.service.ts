import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { platformPlanRepository } from "../repository/platform-plan.repository";
import {
  createPlanSchema,
  updatePlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from "../schema/platform-plan.schema";

/** إدارة الخطط (تسعير المنصة نفسها) - SUPER_ADMIN فقط للتعديل، والجميع للعرض. */
export const platformPlanService = {
  async list() {
    await requirePlatformAdmin();
    return platformPlanRepository.findMany();
  },

  async create(input: CreatePlanInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = createPlanSchema.parse(input);
    const plan = await platformPlanRepository.create(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.plan.created",
      entityType: "Plan",
      entityId: plan.id,
      changes: { after: data },
    });

    return plan;
  },

  async update(input: UpdatePlanInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = updatePlanSchema.parse(input);
    const before = await platformPlanRepository.findById(data.id);
    if (!before) throw new Error("الخطة غير موجودة");

    const plan = await platformPlanRepository.update(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.plan.updated",
      entityType: "Plan",
      entityId: plan.id,
      changes: { before, after: plan },
    });

    return plan;
  },

  async deactivate(id: string) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const tenantsOnPlan = await platformPlanRepository.countTenantsOnPlan(id);
    const plan = await platformPlanRepository.deactivate(id);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.plan.deactivated",
      entityType: "Plan",
      entityId: id,
      changes: { after: { tenantsStillOnPlan: tenantsOnPlan } },
    });

    return plan;
  },
};
