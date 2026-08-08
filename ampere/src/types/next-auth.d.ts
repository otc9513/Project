import type { PlatformRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * توسيع أنواع next-auth الافتراضية.
 *
 * ملاحظة إصلاح (المرحلة 8): هذا الملف لم يكن موجودًا في المراحل السابقة،
 * رغم أن auth.config.ts كان يضيف `session.user.id` و `session.user.isSuperAdmin`
 * فعليًا عبر `as` casting غير آمن (يمرّ في strict mode لكنه لا يمنح أي أمان
 * نوعي حقيقي على بقية الكود الذي يستهلك `session.user`). الإضافة هنا توثّق
 * الشكل الحقيقي للجلسة رسميًا بدل الاعتماد على casting متفرّق.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      platformRole: PlatformRole | null;
    } & DefaultSession["user"];
  }
}
