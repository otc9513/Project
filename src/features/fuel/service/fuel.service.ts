import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { fuelRepository } from "../repository/fuel.repository";
import {
  createFuelPurchaseSchema,
  createFuelUsageSchema,
  fuelFilterSchema,
  type CreateFuelPurchaseInput,
  type CreateFuelUsageInput,
  type FuelFilterInput,
} from "../schema/fuel.schema";

/**
 * الشراء (قرار مالي) محصور بمن يملك صلاحية مالية.
 * تسجيل الاستهلاك اليومي متاح أيضًا للفني لأنه من يتابع المولد ميدانيًا.
 */
const PURCHASE_ROLES = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;
const USAGE_ROLES = ["OWNER", "ADMIN", "TECHNICIAN"] as const;

export const fuelService = {
  async listPurchases(input: Partial<FuelFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = fuelFilterSchema.parse(input);
    return fuelRepository.purchases.findMany(ctx.tenantId, filter);
  },

  async listUsage(input: Partial<FuelFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = fuelFilterSchema.parse(input);
    return fuelRepository.usage.findMany(ctx.tenantId, filter);
  },

  async recordPurchase(input: CreateFuelPurchaseInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...PURCHASE_ROLES]);

    const data = createFuelPurchaseSchema.parse(input);
    const purchase = await fuelRepository.purchases.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "fuel.purchase_recorded",
      entityType: "FuelPurchase",
      entityId: purchase.id,
      changes: { after: data },
    });

    return purchase;
  },

  async recordUsage(input: CreateFuelUsageInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...USAGE_ROLES]);

    const data = createFuelUsageSchema.parse(input);
    const usage = await fuelRepository.usage.create(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "fuel.usage_recorded",
      entityType: "FuelUsage",
      entityId: usage.id,
      changes: { after: data },
    });

    return usage;
  },
};
