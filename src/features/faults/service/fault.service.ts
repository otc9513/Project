import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { prisma } from "@/lib/prisma";
import { pushService } from "@/features/push/service/push.service";
import { faultRepository } from "../repository/fault.repository";
import {
  createFaultSchema,
  assignFaultSchema,
  updateFaultStatusSchema,
  addFaultUpdateSchema,
  faultFilterSchema,
  type CreateFaultInput,
  type AssignFaultInput,
  type UpdateFaultStatusInput,
  type AddFaultUpdateInput,
  type FaultFilterInput,
} from "../schema/fault.schema";

/**
 * الإبلاغ عن عطل متاح لأي عضو في المستأجر (المحصّل قد يكتشف عطلًا ميدانيًا)،
 * بينما التعيين وتغيير الحالة وإغلاق العطل محصورة بمن يدير العمليات الفنية.
 */
const MANAGE_ROLES = ["OWNER", "ADMIN", "TECHNICIAN"] as const;

export const faultService = {
  async list(input: Partial<FaultFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = faultFilterSchema.parse(input);
    return faultRepository.findMany(ctx.tenantId, filter);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const fault = await faultRepository.findById(ctx.tenantId, id);
    if (!fault) {
      throw new Error("العطل غير موجود");
    }
    return fault;
  },

  async create(input: CreateFaultInput) {
    const ctx = await requireTenantContext();
    // بدون requireRole هنا عمدًا: أي مستخدم مرتبط بالمستأجر يمكنه الإبلاغ عن عطل.

    const data = createFaultSchema.parse(input);
    const fault = await faultRepository.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "fault.created",
      entityType: "Fault",
      entityId: fault.id,
      changes: { after: data },
    });

    return fault;
  },

  async assign(input: AssignFaultInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MANAGE_ROLES]);

    const data = assignFaultSchema.parse(input);
    const fault = await faultRepository.assign(ctx.tenantId, data.id, data.assignedToId);

    await recordAuditEntry({
      ctx,
      action: "fault.assigned",
      entityType: "Fault",
      entityId: fault.id,
      changes: { after: { assignedToId: data.assignedToId } },
    });

    // إشعار داخل التطبيق (يظهر دائمًا، بلا اعتماد على دعم المتصفح للإشعارات)
    // + محاولة إشعار Push فورية للفني المعيَّن (أفضل محاولة، لا تُفشل التعيين
    // إن تعذّرت). هذا هو أول استخدام فعلي لبنية الإشعارات المُنشأة في المرحلة 7.
    await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        userId: data.assignedToId,
        title: "تم تعيين عطل جديد لك",
        body: fault.title,
        type: "fault.assigned",
      },
    });
    void pushService.sendToUser(data.assignedToId, {
      title: "تم تعيين عطل جديد لك",
      body: fault.title,
      url: `/app/faults/${fault.id}`,
    });

    return fault;
  },

  async updateStatus(input: UpdateFaultStatusInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MANAGE_ROLES]);

    const data = updateFaultStatusSchema.parse(input);
    const before = await faultRepository.findById(ctx.tenantId, data.id);
    if (!before) {
      throw new Error("العطل غير موجود");
    }

    const fault = await faultRepository.updateStatus(ctx.tenantId, data.id, data.status);

    await recordAuditEntry({
      ctx,
      action: data.status === "COMPLETED" ? "fault.closed" : "fault.status_changed",
      entityType: "Fault",
      entityId: fault.id,
      changes: { before: { status: before.status }, after: { status: fault.status } },
    });

    return fault;
  },

  async addUpdate(input: AddFaultUpdateInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MANAGE_ROLES]);

    const data = addFaultUpdateSchema.parse(input);
    const update = await faultRepository.addUpdate(ctx.tenantId, data.faultId, ctx.userId, data.note);

    await recordAuditEntry({
      ctx,
      action: "fault.update_added",
      entityType: "Fault",
      entityId: data.faultId,
      changes: { after: { note: data.note } },
    });

    return update;
  },

  async countByStatus() {
    const ctx = await requireTenantContext();
    return faultRepository.countByStatus(ctx.tenantId);
  },
};
