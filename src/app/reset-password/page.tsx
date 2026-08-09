import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-xl font-bold dark:text-white">إعادة تعيين كلمة المرور</h1>
        </div>
        <ResetPasswordForm token={token ?? ""} />
      </div>
    </main>
  );
}
