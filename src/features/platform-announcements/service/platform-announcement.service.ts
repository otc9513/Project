import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { requireTenantContext } from "@/lib/tenant/context";
import { prisma } from "@/lib/prisma";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { platformAnnouncementRepository } from "../repository/platform-announcement.repository";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "../schema/platform-announcement.schema";

export const platformAnnouncementService = {
  async list() {
    await requirePlatformAdmin();
    return platformAnnouncementRepository.findMany();
  },

  async create(input: CreateAnnouncementInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = createAnnouncementSchema.parse(input);
    const announcement = await platformAnnouncementRepository.create(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.announcement.created",
      entityType: "Announcement",
      entityId: announcement.id,
      changes: { after: data },
    });

    return announcement;
  },

  async update(input: UpdateAnnouncementInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = updateAnnouncementSchema.parse(input);
    const before = await platformAnnouncementRepository.findById(data.id);
    if (!before) throw new Error("الإعلان غير موجود");

    const announcement = await platformAnnouncementRepository.update(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.announcement.updated",
      entityType: "Announcement",
      entityId: announcement.id,
      changes: { before, after: announcement },
    });

    return announcement;
  },

  async delete(id: string) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    await platformAnnouncementRepository.delete(id);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.announcement.deleted",
      entityType: "Announcement",
      entityId: id,
    });
  },

  /** يُستدعى من تطبيق المستأجر (bottom-nav/layout) - وليس من لوحة Super Admin. */
  async listVisibleForCurrentTenant() {
    const ctx = await requireTenantContext();
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: { planId: true },
    });
    return platformAnnouncementRepository.findVisibleForTenant(ctx.tenantId, tenant.planId);
  },
};
