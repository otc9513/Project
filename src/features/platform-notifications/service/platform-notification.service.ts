import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { sendWebPush } from "@/lib/push/web-push-client";
import { platformNotificationRepository } from "../repository/platform-notification.repository";
import {
  createCampaignSchema,
  updateCampaignSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "../schema/platform-notification.schema";

/**
 * مركز الإشعارات: SUPER_ADMIN و SUPPORT_ADMIN يمكنهما الإنشاء والإرسال
 * (تواصل مع العملاء يدخل ضمن نطاق الدعم)، لكن FINANCE_ADMIN لا صلاحية له
 * هنا إطلاقًا (لا علاقة مالية بهذه الوحدة).
 */
const NOTIFICATION_ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN"] as const;

export const platformNotificationService = {
  async list() {
    await requirePlatformAdmin();
    return platformNotificationRepository.findMany();
  },

  async create(input: CreateCampaignInput) {
    const ctx = await requirePlatformAdmin([...NOTIFICATION_ROLES]);
    const data = createCampaignSchema.parse(input);
    const campaign = await platformNotificationRepository.create(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.notification_campaign.created",
      entityType: "PushNotificationCampaign",
      entityId: campaign.id,
      changes: { after: data },
    });

    return campaign;
  },

  async update(input: UpdateCampaignInput) {
    const ctx = await requirePlatformAdmin([...NOTIFICATION_ROLES]);
    const data = updateCampaignSchema.parse(input);
    const before = await platformNotificationRepository.findById(data.id);
    if (!before) throw new Error("الحملة غير موجودة");
    if (before.status === "SENT") {
      throw new Error("لا يمكن تعديل حملة أُرسِلت بالفعل");
    }

    const campaign = await platformNotificationRepository.update(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.notification_campaign.updated",
      entityType: "PushNotificationCampaign",
      entityId: campaign.id,
      changes: { before, after: campaign },
    });

    return campaign;
  },

  async delete(id: string) {
    const ctx = await requirePlatformAdmin([...NOTIFICATION_ROLES]);
    const campaign = await platformNotificationRepository.findById(id);
    if (!campaign) throw new Error("الحملة غير موجودة");
    if (campaign.status === "SENT") {
      throw new Error("لا يمكن حذف حملة أُرسِلت بالفعل - يمكن تكرارها فقط");
    }

    await platformNotificationRepository.delete(id);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.notification_campaign.deleted",
      entityType: "PushNotificationCampaign",
      entityId: id,
    });
  },

  /**
   * إرسال فوري لحملة (Draft أو Scheduled → Sent). المرسل الفعلي هنا وليس
   * عبر Cron/Queue خارجي - كافٍ لحجم الإشعارات المتوقَّع (حملات المنصة
   * تجاه أصحاب مولدات، وليس ملايين المستخدمين)، ويطابق نمط "أفضل محاولة
   * بدون رمي استثناء لكل جهاز" المعتمد فعلاً في features/push.
   */
  async send(id: string) {
    const ctx = await requirePlatformAdmin([...NOTIFICATION_ROLES]);
    const campaign = await platformNotificationRepository.findById(id);
    if (!campaign) throw new Error("الحملة غير موجودة");
    if (campaign.status === "SENT") throw new Error("أُرسِلت هذه الحملة بالفعل");

    const audience = campaign.audience as Parameters<
      typeof platformNotificationRepository.resolveAudienceSubscriptions
    >[0];
    const subscriptions = await platformNotificationRepository.resolveAudienceSubscriptions(audience);

    let delivered = 0;
    let failed = 0;

    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendWebPush(sub, {
          title: campaign.title,
          body: campaign.message,
          url: campaign.actionUrl ?? undefined,
        })
      )
    );

    for (const result of results) {
      if (result.status === "sent") delivered += 1;
      else failed += 1;
      if (result.status === "expired") {
        await platformNotificationRepository.deleteExpiredSubscription(result.subscriptionId);
      }
    }

    await platformNotificationRepository.upsertStats(id, {
      recipients: subscriptions.length,
      delivered,
      failed,
    });

    const sentCampaign =
      subscriptions.length === 0 || delivered > 0
        ? await platformNotificationRepository.markSent(id)
        : await platformNotificationRepository.markFailed(id);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.notification_campaign.sent",
      entityType: "PushNotificationCampaign",
      entityId: id,
      changes: { after: { recipients: subscriptions.length, delivered, failed } },
    });

    return sentCampaign;
  },
};
