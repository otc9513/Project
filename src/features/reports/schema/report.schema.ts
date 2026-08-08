import { z } from "zod";

/**
 * فترة التقرير: مدى تاريخ حر (وليس محصورًا بشهر/سنة كوحدة الفوترة) لأن التقارير
 * قد تُطلب عن أي مدى زمني (أسبوع، ربع سنة، سنة كاملة...). الإيرادات والمصاريف
 * تُحسب على أساس نقدي (Cash Basis): تاريخ الدفعة الفعلي وتاريخ المصروف الفعلي،
 * وليس شهر/سنة الفاتورة، لأن هذا هو التعريف المعتاد لـ"التدفق النقدي" في
 * التقارير المالية.
 */
export const reportPeriodSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.from <= data.to, {
    message: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
    path: ["to"],
  });

export type ReportPeriodInput = z.infer<typeof reportPeriodSchema>;

export const reportExportFormatSchema = z.enum(["pdf", "excel"]);
export type ReportExportFormat = z.infer<typeof reportExportFormatSchema>;

export const reportTypeSchema = z.enum([
  "financial-summary",
  "revenue-analytics",
  "expense-analytics",
  "collection-report",
]);
export type ReportType = z.infer<typeof reportTypeSchema>;
