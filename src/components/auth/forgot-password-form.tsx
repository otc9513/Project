"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/lib/auth/credentials.actions";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      if (result.resetUrlForDev) setDevLink(result.resetUrlForDev);
    });
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center" dir="rtl">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          إذا كان بريدك الإلكتروني مسجَّلًا لدينا، سيصلك رابط لإعادة تعيين كلمة المرور.
        </p>
        {devLink && (
          <a
            href={devLink}
            className="block break-all rounded-lg bg-gray-100 p-3 text-xs text-primary dark:bg-gray-800"
          >
            (بيئة تطوير فقط) {devLink}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" dir="rtl">
      <div>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          البريد الإلكتروني
        </label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          dir="ltr"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
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
        {isPending ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
      </button>
    </form>
  );
}
