import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { MfaChallengeForm } from "./_components/mfa-challenge-form";

/**
 * مسار top-level مستقل عمدًا (وليس تحت /super-admin) - راجع تعليق
 * `requirePlatformAdmin` في src/lib/platform/context.ts: لو كانت هذه
 * الصفحة تحت تخطيط /super-admin، كل زيارة لها كانت ستُعيد توجيه المستخدم
 * لنفسها من جديد قبل اجتياز التحدّي (حلقة لا نهائية).
 */
export default async function MfaVerifyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.platformRole) {
    // مستخدم عادي بلا صلاحية منصة وصل هنا خطأً - لا معنى لتحدّي 2FA له.
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold">التحقق بخطوتين</h1>
        <p className="mb-6 text-sm text-gray-500">
          أدخل الكود من تطبيق المصادقة، أو أحد أكواد الاسترداد الاحتياطية.
        </p>
        <MfaChallengeForm />
      </div>
    </main>
  );
}
