import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { generatorRepository } from "../repository/generator.repository";
import {
  createGeneratorSchema,
  updateGeneratorSchema,
  type CreateGeneratorInput,
  type UpdateGeneratorInput,
} from "../schema/generator.schema";

/**
 * جميع من لديهم عضوية في المستأجر يمكنهم عرض المولدات،
 * لكن الإنشاء/التعديل/الأرشفة محصورة بـ OWNER و ADMIN فقط.
 */
export const generatorService = {
  async list() {
    const ctx = await requireTenantContext();
    return generatorRepository.findMany(ctx.tenantId);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const generator = await generatorRepository.findById(ctx.tenantId, id);
    if (!generator) {
      throw new Error("المولد غير موجود");
    }
    return generator;
  },

  async create(input: CreateGeneratorInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);

    const data = createGeneratorSchema.parse(input);
    const generator = await generatorRepository.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "generator.created",
      entityType: "Generator",
      entityId: generator.id,
      changes: { after: data },
    });

    return generator;
  },

  async update(input: UpdateGeneratorInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);

    const data = updateGeneratorSchema.parse(input);
    const before = await generatorRepository.findById(ctx.tenantId, data.id);
    if (!before) {
      throw new Error("المولد غير موجود");
    }

    const generator = await generatorRepository.update(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "generator.updated",
      entityType: "Generator",
      entityId: generator.id,
      changes: { before, after: generator },
    });

    return generator;
  },

  async archive(id: string) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);

    await generatorRepository.archive(ctx.tenantId, id);

    await recordAuditEntry({
      ctx,
      action: "generator.archived",
      entityType: "Generator",
      entityId: id,
    });
  },
};
