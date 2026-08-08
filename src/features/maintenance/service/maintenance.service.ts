import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { maintenanceRepository } from "../repository/maintenance.repository";
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceFilterSchema,
  type CreateMaintenanceInput,
  type UpdateMaintenanceInput,
  type MaintenanceFilterInput,
} from "../schema/maintenance.schema";

const MUTATE_ROLES = ["OWNER", "ADMIN", "TECHNICIAN"] as const;

export const maintenanceService = {
  async list(input: Partial<MaintenanceFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = maintenanceFilterSchema.parse(input);
    return maintenanceRepository.findMany(ctx.tenantId, filter);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const record = await maintenanceRepository.findById(ctx.tenantId, id);
    if (!record) {
      throw new Error("سجل الصيانة غير موجود");
    }
    return record;
  },

  async create(input: CreateMaintenanceInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MUTATE_ROLES]);

    const data = createMaintenanceSchema.parse(input);
    const record = await maintenanceRepository.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "maintenance.created",
      entityType: "MaintenanceRecord",
      entityId: record.id,
      changes: { after: data },
    });

    return record;
  },

  async update(input: UpdateMaintenanceInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MUTATE_ROLES]);

    const data = updateMaintenanceSchema.parse(input);
    const before = await maintenanceRepository.findById(ctx.tenantId, data.id);
    if (!before) {
      throw new Error("سجل الصيانة غير موجود");
    }

    const record = await maintenanceRepository.update(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "maintenance.updated",
      entityType: "MaintenanceRecord",
      entityId: record.id,
      changes: { before, after: record },
    });

    return record;
  },

  /** يُستخدم في لوحة التحكم لعرض تذكيرات الصيانة القادمة خلال 7 أيام افتراضيًا */
  async upcoming(days = 7) {
    const ctx = await requireTenantContext();
    return maintenanceRepository.findDueWithin(ctx.tenantId, days);
  },
};
