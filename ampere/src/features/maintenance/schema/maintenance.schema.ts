import { z } from "zod";

export const createMaintenanceSchema = z.object({
  generatorId: z.string().cuid(),
  type: z.string().min(2, "نوع الصيانة مطلوب").max(150),
  description: z.string().max(1000).optional(),
  cost: z.coerce.number().nonnegative("التكلفة يجب أن تكون رقمًا موجبًا أو صفرًا"),
  date: z.coerce.date(),
  technicianId: z.string().cuid().optional(),
  nextDueDate: z.coerce.date().optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const updateMaintenanceSchema = createMaintenanceSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export const maintenanceFilterSchema = z.object({
  generatorId: z.string().cuid().optional(),
  upcomingOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type MaintenanceFilterInput = z.infer<typeof maintenanceFilterSchema>;
