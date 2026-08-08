import { z } from "zod";

export const createFuelPurchaseSchema = z.object({
  generatorId: z.string().cuid(),
  quantityLiters: z.coerce.number().positive("الكمية يجب أن تكون رقمًا موجبًا"),
  price: z.coerce.number().positive("السعر يجب أن يكون رقمًا موجبًا"),
  supplier: z.string().max(150).optional(),
  date: z.coerce.date(),
});

export type CreateFuelPurchaseInput = z.infer<typeof createFuelPurchaseSchema>;

export const createFuelUsageSchema = z.object({
  generatorId: z.string().cuid(),
  quantityLiters: z.coerce.number().positive("الكمية يجب أن تكون رقمًا موجبًا"),
  date: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});

export type CreateFuelUsageInput = z.infer<typeof createFuelUsageSchema>;

export const fuelFilterSchema = z.object({
  generatorId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type FuelFilterInput = z.infer<typeof fuelFilterSchema>;
