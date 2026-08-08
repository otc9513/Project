"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/features/push/actions/push.actions";

/**
 * `PushManager.subscribe` يتطلّب `applicationServerKey` كـ `Uint8Array`، بينما
 * مفتاح VAPID العام يُخزَّن كسلسلة Base64Url - هذا التحويل القياسي الموثَّق
 * من MDN لهذا الغرض بالتحديد.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushSupportStatus = "unsupported" | "checking" | "subscribed" | "unsubscribed" | "denied";

export function PushNotificationToggle() {
  const [status, setStatus] = useState<PushSupportStatus>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "unsubscribed");
    }
    checkStatus();
  }, []);

  async function handleEnable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      // لا توجد مفاتيح VAPID مُهيَّأة بعد لهذه البيئة (راجع .env.example) -
      // نصمت بدل إظهار خطأ مربك لمستخدم عادي.
      return;
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await subscribeToPushAction({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        userAgent: navigator.userAgent,
      });
      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushAction({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || status === "checking") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-gray-400">
        الإشعارات محظورة من إعدادات المتصفح لهذا الموقع
      </p>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={status === "subscribed" ? handleDisable : handleEnable}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
    >
      {status === "subscribed" ? "🔔 إيقاف الإشعارات" : "🔕 تفعيل الإشعارات"}
    </button>
  );
}
