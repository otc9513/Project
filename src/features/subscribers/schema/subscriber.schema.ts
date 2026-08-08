import { z } from "zod";

/**
 * رقم الهاتف العراقي: نقبل صيغًا محلية شائعة (07XXXXXXXXX) أو دولية (+9647XXXXXXXXX)
 */
const iraqiPhoneRegex = /^(?:\+?964|0)?7\d{9}$/;

export const createSubscriberSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(150),
  phone: z
    .string()
    .regex(iraqiPhoneRegex, "رقم الهاتف غير صالح")
    .transform((v) => v.replace(/\s+/g, "")),
  area: z.string().max(150).optional(),
  street: z.string().max(150).optional(),
  houseNumber: z.string().max(50).optional(),
  subscriptionNo: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;

export const updateSubscriberSchema = createSubscriberSchema.partial().extend({
  id: z.string().cuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "DEBT"]).optional(),
});

export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>;

export const subscriberFilterSchema = z.object({
  search: z.string().optional(), // اسم أو هاتف أو رقم اشتراك
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "DEBT"]).optional(),
  area: z.string().optional(),
  sortBy: z.enum(["fullName", "createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type SubscriberFilterInput = z.infer<typeof subscriberFilterSchema>;
