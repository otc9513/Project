import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.enum(["FUEL", "MAINTENANCE", "SPARE_PARTS", "SALARIES", "OTHER"]),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا"),
  date: z.coerce.date(),
  description: z.string().max(1000).optional(),
  attachmentUrl: z.string().url().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const expenseFilterSchema = z.object({
  category: z.enum(["FUEL", "MAINTENANCE", "SPARE_PARTS", "SALARIES", "OTHER"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ExpenseFilterInput = z.infer<typeof expenseFilterSchema>;
