import { z } from "zod";

export const generateSaasInvoiceSchema = z.object({
  tenantId: z.string().cuid(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});
export type GenerateSaasInvoiceInput = z.infer<typeof generateSaasInvoiceSchema>;

export const recordSaasPaymentSchema = z.object({
  saasInvoiceId: z.string().cuid(),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  note: z.string().max(500).optional(),
  paidAt: z.coerce.date().optional(),
});
export type RecordSaasPaymentInput = z.infer<typeof recordSaasPaymentSchema>;

export const cancelSaasInvoiceSchema = z.object({
  saasInvoiceId: z.string().cuid(),
  reason: z.string().min(3).max(500),
});
export type CancelSaasInvoiceInput = z.infer<typeof cancelSaasInvoiceSchema>;

export const listSaasInvoicesSchema = z.object({
  tenantId: z.string().cuid().optional(),
  status: z.enum(["UNPAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListSaasInvoicesInput = z.infer<typeof listSaasInvoicesSchema>;
