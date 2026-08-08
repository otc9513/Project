import { z } from "zod";
import { FEATURE_REGISTRY } from "@/lib/features/feature-registry";

const featureKeys = FEATURE_REGISTRY.map((f) => f.key) as [string, ...string[]];

export const planFeaturesSchema = z.record(z.enum(featureKeys), z.boolean());

export const createPlanSchema = z.object({
  name: z.string().min(2).max(50),
  nameAr: z.string().min(2).max(50),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0).optional(),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  maxGenerators: z.coerce.number().int().positive().optional(),
  maxSubscribers: z.coerce.number().int().positive().optional(),
  maxEmployees: z.coerce.number().int().positive().optional(),
  features: planFeaturesSchema,
  sortOrder: z.coerce.number().int().default(0),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial().extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
