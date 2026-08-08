import * as Sentry from "@sentry/nextjs";

/** ⚠️ راجع نفس ملاحظة التحقق في sentry.client.config.ts. */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  debug: false,

  // فصل السياق حسب نوع العملية (Cron مقابل طلب مستخدم عادي) عبر الوسم
  // اليدوي في الأماكن التي تستدعيه (راجع billing-cron.service.ts) بدل
  // فحص المسار هنا - أوضح وأقل هشاشة من مطابقة نصوص مسارات.
  beforeSend(event) {
    // خط دفاع أخير: لا نُرسل أبدًا حقل "cookie" أو "authorization" إن
    // تسرّب لأي حدث بطريق الخطأ (بعض تكاملات Sentry التلقائية تلتقط
    // رؤوس الطلب الخام).
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
    }
    return event;
  },
});
