import { z } from "zod";

export const listTenantsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"]).optional(),
  planId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListTenantsInput = z.infer<typeof listTenantsSchema>;

export const suspendTenantSchema = z.object({
  tenantId: z.string().cuid(),
  reason: z.string().min(3, "سبب التعليق إلزامي").max(500),
});
export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>;

export const activateTenantSchema = z.object({
  tenantId: z.string().cuid(),
});
export type ActivateTenantInput = z.infer<typeof activateTenantSchema>;

export const cancelTenantSchema = z.object({
  tenantId: z.string().cuid(),
  reason: z.string().min(3, "سبب الإلغاء إلزامي").max(500),
});
export type CancelTenantInput = z.infer<typeof cancelTenantSchema>;

export const extendSubscriptionSchema = z.object({
  tenantId: z.string().cuid(),
  days: z.coerce.number().int().min(1).max(3650),
});
export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>;

export const changeTenantPlanSchema = z.object({
  tenantId: z.string().cuid(),
  planId: z.string().cuid(),
});
export type ChangeTenantPlanInput = z.infer<typeof changeTenantPlanSchema>;

export const setFeatureOverrideSchema = z.object({
  tenantId: z.string().cuid(),
  featureKey: z.string().min(1).max(100),
  // null = إزالة التجاوز والعودة لافتراضي الخطة
  value: z.boolean().nullable(),
});
export type SetFeatureOverrideInput = z.infer<typeof setFeatureOverrideSchema>;
