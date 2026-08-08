import { z } from "zod";

export const createAmperePlanSchema = z.object({
  ampere: z.coerce.number().positive("قيمة الأمبير يجب أن تكون موجبة"),
  defaultPrice: z.coerce.number().nonnegative("السعر لا يمكن أن يكون سالبًا"),
  isCustom: z.boolean().default(false),
});
export type CreateAmperePlanInput = z.infer<typeof createAmperePlanSchema>;

export const createSubscriptionSchema = z.object({
  subscriberId: z.string().cuid(),
  generatorId: z.string().cuid(),
  amperePlanId: z.string().cuid(),
  monthlyPrice: z.coerce.number().nonnegative(),
  startDate: z.coerce.date(),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

/**
 * تغيير أمبير و/أو سعر اشتراك قائم. وفق قاعدة العمل الرسمية:
 * "عند تغيير الاشتراك: يُحفظ السعر/الأمبير السابق، يُطبَّق الجديد،
 *  ويُسجَّل التاريخ والمستخدم الذي قام بالتغيير" — هذا يتم عبر SubscriptionHistory
 *  تلقائيًا داخل service، وليس مسؤولية الـ UI.
 */
export const changeSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  newAmperePlanId: z.string().cuid().optional(),
  newMonthlyPrice: z.coerce.number().nonnegative().optional(),
}).refine(
  (data) => data.newAmperePlanId !== undefined || data.newMonthlyPrice !== undefined,
  { message: "يجب تحديد تغيير واحد على الأقل: الأمبير أو السعر" }
);
export type ChangeSubscriptionInput = z.infer<typeof changeSubscriptionSchema>;
