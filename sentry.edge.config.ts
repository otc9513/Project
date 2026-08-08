import * as Sentry from "@sentry/nextjs";

/**
 * middleware.ts (فحص المصادقة قبل كل صفحة) يعمل على Edge Runtime وليس
 * Node.js - يحتاج إعداد Sentry منفصلاً بخيارات محدودة أكثر (لا وصول
 * لبعض واجهات Node). ⚠️ راجع نفس ملاحظة التحقق في sentry.client.config.ts.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  debug: false,
});
