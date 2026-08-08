import { z } from "zod";

export const inviteAdminSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  role: z.enum(["SUPER_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN"]),
});
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;

export const revokeAdminSchema = z.object({
  userId: z.string().cuid(),
});
export type RevokeAdminInput = z.infer<typeof revokeAdminSchema>;

export const cancelInviteSchema = z.object({
  inviteId: z.string().cuid(),
});
export type CancelInviteInput = z.infer<typeof cancelInviteSchema>;
