import { z } from "zod";

const visibilitySchema = z.object({
  allTenants: z.boolean().default(true),
  tenantIds: z.array(z.string().cuid()).default([]),
  planIds: z.array(z.string().cuid()).default([]),
});

export const createAnnouncementSchema = z
  .object({
    title: z.string().min(2).max(150),
    description: z.string().min(2).max(2000),
    imageUrl: z.string().url().optional().nullable(),
    buttonText: z.string().max(50).optional().nullable(),
    buttonUrl: z.string().url().optional().nullable(),
    priority: z.coerce.number().int().min(0).max(10).default(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    visibility: visibilitySchema,
  })
  .refine((d) => !d.endDate || d.endDate > d.startDate, {
    message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
    path: ["endDate"],
  });
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(2).max(150).optional(),
  description: z.string().min(2).max(2000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  buttonText: z.string().max(50).optional().nullable(),
  buttonUrl: z.string().url().optional().nullable(),
  priority: z.coerce.number().int().min(0).max(10).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  visibility: visibilitySchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
