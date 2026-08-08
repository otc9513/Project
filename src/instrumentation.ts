import * as Sentry from "@sentry/nextjs";

/**
 * اصطلاح Next.js 15 الرسمي (instrumentation.ts في جذر src/) - يُستدعى
 * مرة واحدة عند إقلاع الخادم. NEXT_RUNTIME يفرّق بين عملية Node.js
 * الكاملة (Server Actions، API Routes، Cron) وعملية Edge (middleware.ts).
 *
 * ⚠️ راجع ملاحظة التحقق في sentry.client.config.ts - نفس القيد ينطبق هنا.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * معالج الأخطاء الرسمي لـ Next.js 15 App Router - يُستدعى تلقائيًا لكل
 * خطأ غير مُلتقَط في Server Components/Server Actions/Route Handlers لم
 * تُمسكه أي error.tsx محلية (أو حتى الممسوكة، حسب إعداد Sentry - يعمل
 * كخط دفاع شامل إضافي وليس بديلاً عن Sentry.captureException اليدوي في
 * error.tsx/global-error.tsx الموجودين أصلاً في المشروع).
 */
export const onRequestError = Sentry.captureRequestError;
