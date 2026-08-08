import { z } from "zod";

export const generateMonthlyInvoicesSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  dueInDays: z.coerce.number().int().min(1).max(60).default(10),
});
export type GenerateMonthlyInvoicesInput = z.infer<typeof generateMonthlyInvoicesSchema>;

export const generateIndividualInvoiceSchema = z.object({
  subscriberId: z.string().cuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  dueInDays: z.coerce.number().int().min(1).max(60).default(10),
});
export type GenerateIndividualInvoiceInput = z.infer<typeof generateIndividualInvoiceSchema>;

export const invoiceFilterSchema = z.object({
  status: z.enum(["PAID", "UNPAID", "PARTIAL", "CANCELLED"]).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  subscriberId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;

export const cancelInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
  reason: z.string().min(3).max(500),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
