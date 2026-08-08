import { z } from "zod";

export const createFaultSchema = z.object({
  generatorId: z.string().cuid(),
  title: z.string().min(2, "عنوان العطل مطلوب").max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export type CreateFaultInput = z.infer<typeof createFaultSchema>;

export const assignFaultSchema = z.object({
  id: z.string().cuid(),
  assignedToId: z.string().cuid(),
});

export type AssignFaultInput = z.infer<typeof assignFaultSchema>;

export const updateFaultStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED"]),
});

export type UpdateFaultStatusInput = z.infer<typeof updateFaultStatusSchema>;

export const addFaultUpdateSchema = z.object({
  faultId: z.string().cuid(),
  note: z.string().min(1, "الملاحظة مطلوبة").max(1000),
});

export type AddFaultUpdateInput = z.infer<typeof addFaultUpdateSchema>;

export const faultFilterSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  generatorId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type FaultFilterInput = z.infer<typeof faultFilterSchema>;
