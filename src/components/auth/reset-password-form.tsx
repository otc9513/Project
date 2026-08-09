"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/lib/auth/credentials.actions";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await resetPasswordAction({ token, password, confirmPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    });
  }

  if (!token) {
    return (
      <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        رابط الاستعادة غير صالح
      </p>
    );
  }

  if (success) {
    return (
      <p className="text-sm text-success">
        تم تحديث كلمة المرور بنجاح، جارٍ تحويلك لتسجيل الدخول...
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" dir="rtl">
      <div>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          كلمة المرور الجديدة
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          dir="ltr"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          تأكيد كلمة المرور
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          dir="ltr"
          className={inputClass}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-primary py-3.5 text-base font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
      </button>
    </form>
  );
}
