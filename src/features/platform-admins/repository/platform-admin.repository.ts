import "server-only";
import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";

export const platformAdminRepository = {
  listActiveAdmins() {
    return prisma.user.findMany({
      where: { platformRole: { not: null } },
      select: { id: true, name: true, email: true, image: true, platformRole: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  },

  listPendingInvites() {
    return prisma.platformAdminInvite.findMany({
      where: { consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  findInviteByEmail(email: string) {
    return prisma.platformAdminInvite.findUnique({ where: { email } });
  },

  createInvite(email: string, role: PlatformRole, invitedById: string) {
    return prisma.platformAdminInvite.create({ data: { email, role, invitedById } });
  },

  cancelInvite(inviteId: string) {
    return prisma.platformAdminInvite.delete({ where: { id: inviteId } });
  },

  revokeRole(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { platformRole: null } });
  },

  countSuperAdmins() {
    return prisma.user.count({ where: { platformRole: "SUPER_ADMIN" } });
  },
};
