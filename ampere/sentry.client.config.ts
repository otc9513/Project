import * as Sentry from "@sentry/nextjs";

/**
 * ⚠️ لم يُشغَّل `npm install` فعليًا في هذه الجلسة - بنية استدعاء
 * `Sentry.init` هنا مبنية على معرفتي بواجهة `@sentry/nextjs` v8
 * المعتادة. تحقّق من توافقها مع النسخة المثبَّتة فعليًا بعد `npm install`،
 * خصوصًا خيار `integrations`/`replaysSessionSampleRate` إن اختلفت
 * التسمية بين إصدارات.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // لا نرسل شيئًا إن لم يُضبَط DSN (بيئة تطوير محلية بلا حساب Sentry) -
  // Sentry.init نفسها تتجاهل الاستدعاءات بصمت إن كان dsn فارغًا/undefined،
  // موثَّق هنا صراحةً لتوضيح السلوك المقصود وليس نسيانًا.

  // نسبة أخذ العيّنات منخفضة عمدًا (10%) لتتبّع الأداء - منتج SaaS بعدد
  // مستأجرين محدود نسبيًا لا يحتاج تتبعًا كاملاً لكل طلب، ويُبقي كلفة
  // Sentry ضمن الخطة المجانية/الأساسية لأطول فترة ممكنة.
  tracesSampleRate: 0.1,

  // المرحلة 9 تنص صراحة: "لا بيانات شخصية غير ضرورية" - نُعطّل جمع PII
  // التلقائي (عناوين IP، رؤوس الطلب الكاملة) الذي يُفعَّل افتراضيًا في
  // بعض إصدارات SDK.
  sendDefaultPii: false,

  debug: false,
});

// يُطلَب من Next.js 15 عند استخدام Sentry مع App Router لالتقاط أخطاء
// التنقّل بين الصفحات (router transitions) في متصفح العميل.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
