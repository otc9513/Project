-- إضافة دعم تسجيل الدخول برقم الهاتف العراقي والبريد الإلكتروني + كلمة مرور
-- (بجانب Google OAuth الحالي، بدون أي تعديل على الحسابات القائمة).

ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Unique constraint على مستوى قاعدة البيانات (وليس فقط على مستوى التطبيق)
-- لمنع تسجيل نفس الرقم في أكثر من حساب حتى تحت Race Conditions متزامنة.
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- ملاحظة: NULL لا يتعارض مع UNIQUE في PostgreSQL (يمكن لعدد لا نهائي من
-- المستخدمين أن يملكوا phone = NULL في آن واحد)، وهو تحديدًا المطلوب هنا
-- لأن حسابات Google الخالصة لن تملك رقم هاتف أبدًا.
