import { z } from "zod";

const roleEnum = z.enum(["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR", "TECHNICIAN"]);

const audienceSchema = z
  .object({
    allUsers: z.boolean().default(false),
    tenantIds: z.array(z.string().cuid()).default([]),
    planIds: z.array(z.string().cuid()).default([]),
    roles: z.array(roleEnum).default([]),
  })
  // المرحلة 3 (استهداف الواجهة): يمنع "جمهورًا فارغًا" عمليًا - إما الكل،
  // أو مستأجرون محددون، أو خطط محددة. الأدوار وحدها فلتر إضافي فوق
  // أحدهما (راجع resolveAudienceSubscriptions) ولا تُشكّل جمهورًا بذاتها.
  .refine(
    (a) => a.allUsers || a.tenantIds.length > 0 || a.planIds.length > 0,
    { message: "حدّد جمهورًا: كل المستخدمين، أو مستأجرون محددون، أو خطط محددة" }
  );
export type CampaignAudience = z.infer<typeof audienceSchema>;

export const createCampaignSchema = z.object({
  title: z.string().min(2).max(150),
  message: z.string().min(2).max(500),
  imageUrl: z.string().url().optional().nullable(),
  actionText: z.string().max(50).optional().nullable(),
  actionUrl: z.string().url().optional().nullable(),
  audience: audienceSchema,
  scheduledFor: z.coerce.date().optional().nullable(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
