import { z } from "zod";

/**
 * فلتر الفترة الزمنية للوحة التحكم. القيم الافتراضية هي الشهر/السنة الحاليان
 * (نفس نمط `billingService.monthlySummary`) حتى تبقى لوحة التحكم متسقة مع
 * شاشتي الفوترة والتقارير من حيث تعريف "الفترة".
 */
export const dashboardPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  /** عدد الأيام القادمة لاعتبار الصيانة "مستحقة قريبًا" في تنبيهات اللوحة */
  maintenanceWindowDays: z.coerce.number().int().min(1).max(90).default(7),
});

export type DashboardPeriodInput = z.infer<typeof dashboardPeriodSchema>;
