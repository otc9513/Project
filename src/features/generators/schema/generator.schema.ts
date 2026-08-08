import { z } from "zod";

export const createGeneratorSchema = z.object({
  name: z.string().min(2, "اسم المولد يجب أن يكون حرفين على الأقل").max(100),
  location: z.string().max(200).optional(),
  capacityKva: z.coerce.number().positive("القدرة يجب أن تكون رقمًا موجبًا").optional(),
  fuelType: z.enum(["DIESEL", "GASOLINE", "GAS"]).default("DIESEL"),
  notes: z.string().max(1000).optional(),
});

export type CreateGeneratorInput = z.infer<typeof createGeneratorSchema>;

export const updateGeneratorSchema = createGeneratorSchema.partial().extend({
  id: z.string().cuid(),
  status: z.enum(["OPERATIONAL", "UNDER_MAINTENANCE", "OFFLINE"]).optional(),
});

export type UpdateGeneratorInput = z.infer<typeof updateGeneratorSchema>;
