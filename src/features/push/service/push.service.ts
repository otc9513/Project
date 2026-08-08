import "server-only";
import { requireTenantContext } from "@/lib/tenant/context";
import { sendWebPush, type PushPayload } from "@/lib/push/web-push-client";
import { pushRepository } from "../repository/push.repository";
import {
  subscribeToPushSchema,
  unsubscribeFromPushSchema,
  type SubscribeToPushInput,
  type UnsubscribeFromPushInput,
} from "../schema/push.schema";

export const pushService = {
  async subscribe(input: SubscribeToPushInput) {
    const ctx = await requireTenantContext();
    const data = subscribeToPushSchema.parse(input);
    return pushRepository.upsert(
      ctx.tenantId,
      ctx.userId,
      data.endpoint,
      data.keys.p256dh,
      data.keys.auth,
      data.userAgent
    );
  },

  async unsubscribe(input: UnsubscribeFromPushInput) {
    const ctx = await requireTenantContext();
    const data = unsubscribeFromPushSchema.parse(input);
    await pushRepository.deleteByEndpoint(ctx.userId, data.endpoint);
  },

  /**
   * إرسال إشعار لكل أجهزة مستخدم واحد (قد يكون مسجَّلاً من أكثر من متصفح/جهاز).
   * يُستخدم من داخل services أخرى (مثال: faultService.assign) كإجراء "أفضل
   * محاولة" (Best Effort) - لا يجب أبدًا أن يُفشل استدعاءه العملية الأساسية،
   * لذا هو مُغلَّف داخليًا ولا يرمي استثناءات للخارج.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const subscriptions = await pushRepository.findByUser(userId);
      if (subscriptions.length === 0) return;

      const results = await Promise.all(
        subscriptions.map((sub) => sendWebPush(sub, payload))
      );

      const expired = results.filter((r) => r.status === "expired");
      await Promise.all(expired.map((r) => pushRepository.deleteById(r.subscriptionId)));
    } catch {
      // أفضل محاولة فقط - أي خطأ هنا (شبكة، تهيئة VAPID غير مكتملة...) يُكتَم عمدًا
    }
  },

  async sendToTenant(tenantId: string, payload: PushPayload): Promise<void> {
    try {
      const subscriptions = await pushRepository.findByTenant(tenantId);
      if (subscriptions.length === 0) return;

      const results = await Promise.all(
        subscriptions.map((sub) => sendWebPush(sub, payload))
      );

      const expired = results.filter((r) => r.status === "expired");
      await Promise.all(expired.map((r) => pushRepository.deleteById(r.subscriptionId)));
    } catch {
      // أفضل محاولة فقط
    }
  },
};
