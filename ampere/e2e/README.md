# اختبارات E2E (Playwright) — لم تُشغَّل فعليًا بعد

⚠️ كل ملفات هذا المجلد كُتبت في جلسة بلا اتصال إنترنت وبلا خادم تطوير
شغّال وبلا قاعدة بيانات فعلية. المنطق مبني على قراءة الكود الفعلي
للمشروع (أسماء الحقول، النصوص المعروضة، بنية الصفحات) بثقة عالية، لكن
**لم يُشغَّل ولو مرة واحدة**. تحقّق مما يلي قبل أول تشغيل:

## 1. قاعدة بيانات + seed
```bash
npm run db:migrate   # أو db:deploy على قاعدة موجودة
npm run db:seed      # يحتاج SEED_SUPER_ADMIN_EMAIL في .env
```
الاختبارات تفترض وجود خطة واحدة نشطة على الأقل (`Plan.isActive=true`) -
seed.ts يُفترض أنه يُنشئها (لم أُراجع محتواه بالكامل في هذه الجلسة).

## 2. أهم نقطة غير مؤكَّدة: تجاوز مصادقة Google OAuth
`e2e/auth-helper.ts` يُنشئ صف `Session` مباشرة عبر Prisma ويضبط كوكي
باسم `authjs.session-token` (افتراضي Auth.js v5 مع `session.strategy:
"database"` - مؤكَّد من `auth.config.ts`). **لم يُتحقَّق من**:
- عدم وجود `cookies: { sessionToken: { name: "..." } }` مخصَّص في
  `auth.config.ts` يُغيّر هذا الاسم.
- أن `NEXTAUTH_URL`/domain الكوكي يطابقان فعليًا `localhost:3000` في
  بيئة تشغيلك.

إن فشل تسجيل الدخول (تحويل لصفحة `/login` بدل الوصول لـ `/app`)، هذا
أول مكان للفحص - افتح أدوات المطوّر في المتصفح أثناء تشغيل
`npx playwright test --headed --debug` وقارن اسم الكوكي الفعلي الذي
يضبطه NextAuth بعد تسجيل دخول حقيقي يدوي بالاسم المستخدَم هنا.

## 3. التشغيل
```bash
npm run dev            # في نافذة طرفية منفصلة (webServer معطَّل محليًا في playwright.config.ts لتسريع التكرار)
npm run test:e2e
```

## 4. لماذا هذان المساران تحديدًا
اختيرا لأنهما مذكوران حرفيًا كمثالين في قسم "E2E" من برومبت إتمام
الإنتاج:
- `tenant-billing-flow.spec.ts`: Login → Tenant dashboard → Subscription page → View invoice
- `announcement-targeting-flow.spec.ts`: Super Admin → Create announcement → Target tenant → Tenant sees announcement (+ تحقق سلبي إضافي: مستأجر غير مستهدَف لا يراه)
