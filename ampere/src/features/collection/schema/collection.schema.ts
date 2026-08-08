import { z } from "zod";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.coerce.number().positive("مبلغ الدفعة يجب أن يكون موجبًا"),
  note: z.string().max(500).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const unpaidSubscribersFilterSchema = z.object({
  search: z.string().optional(),
  area: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type UnpaidSubscribersFilterInput = z.infer<typeof unpaidSubscribersFilterSchema>;
