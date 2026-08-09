import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-xl font-bold dark:text-white">نسيت كلمة المرور؟</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <a href="/login" className="font-medium text-primary hover:underline">
            العودة لتسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  );
}
