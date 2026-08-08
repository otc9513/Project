const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // نستخدم مصدر Service Worker مخصّصًا (worker/index.js) بدل التوليد
  // التلقائي الكامل (GenerateSW) لأننا نحتاج معالجات push/notificationclick
  // مخصّصة لا يوفّرها التوليد الجاهز - راجع التوثيق داخل worker/index.js.
  //
  // ⚠️ ملاحظة تحقّق: لم يتسنَّ اختبار هذا الإعداد ببناء (`next build`) فعلي
  // في بيئة التطوير الحالية (بلا اتصال إنترنت لتثبيت الحزم). إن فشل البناء
  // بخطأ متعلق بـ`workboxOptions.swSrc`، راجع توثيق @ducanh2912/next-pwa
  // الحالي على npm للتأكد من اسم الخيار الصحيح في الإصدار المثبَّت فعليًا.
  workboxOptions: {
    swSrc: "worker/index.js",
  },
  fallbacks: {
    document: "/offline",
  },
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // المرحلة 9 (تدقيق أمني): رؤوس أمان HTTP لم تكن مُعرَّفة في أي مكان
  // بالمشروع. تُطبَّق على كل المسارات عبر headers() بدل middleware حتى
  // تُرسَل حتى على الأصول الثابتة والصفحات التي لا يمرّ عليها middleware.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // يمنع تحميل التطبيق داخل iframe من موقع آخر (Clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // يمنع المتصفح من تخمين نوع محتوى مختلف عمّا أُرسِل فعليًا
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // يفرض HTTPS لمدة سنة على كل الزوار العائدين (لا تأثير له محليًا على http)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // CSP: نسمح بمصادر الخطوط الديناميكية (البراندنغ، المرحلة 8)
          // وبتخزين الأصول البصرية (S3-compatible) بصيغة عامة عبر https
          // بدل تقييدها بمزوّد بعينه، لأن STORAGE_ENDPOINT قابل للتغيير
          // حسب بيئة كل عميل مستضيف (self-hosted).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              // المرحلة 9: يسمح بإرسال تقارير الأخطاء لـ Sentry من
              // متصفح العميل - نمط عام (*.sentry.io / *.ingest.us.sentry.io)
              // بدل استضافة Sentry الذاتية المحدَّدة بدقة، لأن مضيف
              // الالتقاط (ingest host) الفعلي يعتمد على منطقة/تنظيم
              // حساب Sentry المُنشأ فعليًا (غير معروف مسبقًا في هذه
              // الجلسة) - ضيّق هذا لاحقًا لمضيف Sentry الدقيق إن رغبت
              // بسياسة CSP أكثر صرامة.
              "connect-src 'self' https: https://*.sentry.io",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(withPWA(nextConfig), {
  // المرحلة 9: يرفع خرائط المصدر (Source Maps) تلقائيًا عند البناء في
  // CI فقط (حين تتوفر متغيرات SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
  // - راجع .env.example) حتى تظهر أسماء الملفات/الدوال الحقيقية في
  // تتبّعات الأخطاء بدل كود JS مصغَّر غير قابل للقراءة. لا يفشل البناء
  // إن غابت هذه المتغيرات محليًا (silent: true).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
