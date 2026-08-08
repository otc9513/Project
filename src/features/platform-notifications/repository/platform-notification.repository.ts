import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CampaignAudience } from "../schema/platform-notification.schema";
import type { CreateCampaignInput, UpdateCampaignInput } from "../schema/platform-notification.schema";

export const platformNotificationRepository = {
  findMany() {
    return prisma.pushNotificationCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { stats: true },
    });
  },

  findById(id: string) {
    return prisma.pushNotificationCampaign.findUnique({
      where: { id },
      include: { stats: true },
    });
  },

  create(data: CreateCampaignInput) {
    return prisma.pushNotificationCampaign.create({
      data: {
        ...data,
        status: data.scheduledFor ? "SCHEDULED" : "DRAFT",
      },
    });
  },

  update({ id, ...data }: UpdateCampaignInput) {
    return prisma.pushNotificationCampaign.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.pushNotificationCampaign.delete({ where: { id } });
  },

  markSent(id: string) {
    return prisma.pushNotificationCampaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  },

  markFailed(id: string) {
    return prisma.pushNotificationCampaign.update({
      where: { id },
      data: { status: "FAILED" },
    });
  },

  upsertStats(campaignId: string, data: { recipients: number; delivered: number; failed: number }) {
    return prisma.notificationStat.upsert({
      where: { campaignId },
      update: data,
      create: { campaignId, ...data },
    });
  },

  /** ينظّف اشتراكات push منتهية الصلاحية (404/410 من متصفح المستخدم) اكتُشفت أثناء إرسال حملة. */
  deleteExpiredSubscription(id: string) {
    return prisma.pushSubscription.delete({ where: { id } }).catch(() => undefined);
  },

  /**
   * يحل جمهور الحملة إلى قائمة اشتراكات push فعلية قابلة للإرسال إليها.
   * PushSubscription هو "من نملك فعليًا القدرة على الوصول إليه" (جهاز
   * مسجَّل)، والجمهور هو فقط فلتر عليه.
   */
  async resolveAudienceSubscriptions(audience: CampaignAudience) {
    if (audience.allUsers) {
      return prisma.pushSubscription.findMany();
    }

    const where: Prisma.PushSubscriptionWhereInput = {
      OR: [
        audience.tenantIds.length > 0 ? { tenantId: { in: audience.tenantIds } } : undefined,
        audience.planIds.length > 0
          ? { tenant: { planId: { in: audience.planIds } } }
          : undefined,
      ].filter(Boolean) as Prisma.PushSubscriptionWhereInput[],
    };

    if (!where.OR || where.OR.length === 0) {
      // لا شروط استهداف محدَّدة (لا مستأجرون ولا خطط ولا allUsers) = لا جمهور
      return [];
    }

    let subscriptions = await prisma.pushSubscription.findMany({
      where,
      include: { user: { include: { memberships: true } } },
    });

    if (audience.roles.length > 0) {
      subscriptions = subscriptions.filter((sub) =>
        sub.user.memberships.some(
          (m) => m.tenantId === sub.tenantId && audience.roles.includes(m.role)
        )
      );
    }

    return subscriptions;
  },
};
