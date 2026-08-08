import "server-only";
import webpush from "web-push";

/**
 * مفاتيح VAPID تُولَّد مرة واحدة محليًا بالأمر:
 *   npx web-push generate-vapid-keys
 * ثم تُحفَظ في `.env` (لا يجوز توليدها أو ترميزها ضمن الكود مطلقًا لأنها
 * أسرار تشفير خاصة بكل نشر/بيئة).
 */
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@ampere.app";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface WebPushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSendResult =
  | { subscriptionId: string; status: "sent" }
  | { subscriptionId: string; status: "expired" } // 404/410: الاشتراك لم يعد صالحًا، يجب حذفه
  | { subscriptionId: string; status: "failed"; error: string };

/**
 * إرسال إشعار فعلي لاشتراك واحد. لا يرمي استثناءً أبدًا - فشل إرسال إشعار
 * لجهاز واحد يجب ألا يُسقط أي عملية عمل أساسية (تعيين عطل، إلخ) تستدعيه.
 * إن لم تكن مفاتيح VAPID مُهيَّأة بعد (بيئة تطوير مثلاً)، تُرجَع النتيجة
 * "failed" بصمت دون رمي خطأ.
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: PushPayload
): Promise<PushSendResult> {
  if (!ensureConfigured()) {
    return { subscriptionId: subscription.id, status: "failed", error: "VAPID keys not configured" };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { subscriptionId: subscription.id, status: "sent" };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return { subscriptionId: subscription.id, status: "expired" };
    }
    return {
      subscriptionId: subscription.id,
      status: "failed",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}
