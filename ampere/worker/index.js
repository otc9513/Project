import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

/**
 * ملف مصدر مخصّص (InjectManifest) بدل الاكتفاء بالوضع الافتراضي
 * (GenerateSW) لأننا نحتاج منطقًا مخصّصًا (أحداث push/notificationclick)
 * لا يمكن التعبير عنه عبر خيارات runtimeCaching الجاهزة وحدها.
 * `@ducanh2912/next-pwa` يبني هذا الملف عبر webpack ويحقن قائمة الأصول
 * المُخزَّنة مسبقًا (Precache Manifest) في `self.__WB_MANIFEST` تلقائيًا.
 */

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// طلبات التنقّل بين الصفحات (Navigations): نُحاول الشبكة أولًا (بيانات
// حديثة عند الاتصال) مع مهلة قصيرة، ثم نسقط تلقائيًا لآخر نسخة مخزَّنة من
// نفس الصفحة عند الفشل - هذا ما يجعل "فتح قائمة المشتركين دون اتصال"
// (المطلوب صراحةً في المواصفات لشاشة التحصيل) يعمل عمليًا: بعد أول زيارة
// أونلاين لصفحة `/app/collection`، تبقى نسخة صالحة منها متاحة أوفلاين.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "ampere-pages",
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

// أصول ثابتة (خطوط/صور/سكربتات/أنماط): نُقدّم من الكاش فورًا مع تحديث في
// الخلفية (Stale-While-Revalidate) - سرعة تحميل قصوى على اتصال بطيء، وهو
// أحد المتطلبات الصريحة (الأداء على الأجهزة المحمولة والاتصال البطيء).
registerRoute(
  ({ request }) =>
    ["style", "script", "font", "image"].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: "ampere-static-assets" })
);

/**
 * Web Push: استقبال إشعار من الخادم عبر `web-push` (راجع
 * src/lib/push/web-push-client.ts) وعرضه كإشعار نظام، مع تمرير رابط الوجهة
 * ضمن بيانات الإشعار ليُستخدم عند النقر عليه.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "أمبير", body: event.data.text() };
  }

  const title = payload.title || "أمبير";
  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    dir: "rtl",
    lang: "ar",
    data: { url: payload.url || "/app" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const existing = clientsArr.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
