import "server-only";
import {
  createTenantForNewUser,
  consumePlatformAdminInvite,
} from "@/lib/tenant/onboarding";

/**
 * نفس ما يفعله بالضبط حدث `createUser` في src/lib/auth/auth.ts عند أول
 * تسجيل دخول عبر Google - مستخرَج هنا كدالة مشتركة حتى يحصل مستخدمو
 * البريد/الهاتف الجدد على نفس السلوك تمامًا (مساحة عمل تُنشأ تلقائيًا +
 * فحص دعوات فريق المنصة) دون تكرار المنطق أو اختلافه بين الطرق الثلاث.
 */
export async function provisionNewUser(params: {
  userId: string;
  userEmail: string | null;
  userName: string;
}) {
  // إنشاء المساحة يتطلب بريدًا إلكترونيًا حاليًا (createTenantForNewUser
  // يستخدمه لاشتقاق اسم المساحة الافتراضي إن لم يوجد اسم). حسابات الهاتف
  // بلا بريد تُمرَّر بديلاً نصيًا ثابتًا هنا فقط لغرض توليد الاسم/الـ slug -
  // لا يُخزَّن كبريد إلكتروني فعلي للمستخدم في أي مكان.
  await createTenantForNewUser({
    userId: params.userId,
    userEmail: params.userEmail ?? `${params.userId}@phone.local`,
    userName: params.userName,
  });

  if (params.userEmail) {
    await consumePlatformAdminInvite(params.userId, params.userEmail);
  }
}
