import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { AuthMethodTabs } from "@/components/auth/auth-method-tabs";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold dark:text-white">إنشاء حساب</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            يتم إنشاء حسابك ومساحة عملك فورًا - بلا كود تحقق
          </p>
        </div>

        <GoogleSignInButton label="المتابعة عبر Google" />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">أو</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <AuthMethodTabs mode="register" />

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          لديك حساب بالفعل؟{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  );
}
