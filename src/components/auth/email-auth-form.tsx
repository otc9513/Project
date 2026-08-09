"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithEmailAction,
  registerWithEmailAction,
} from "@/lib/auth/credentials.actions";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function EmailAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return; // يمنع الضغط المتكرر
    setError(null);

    startTransition(async () => {
      const result = isRegister
        ? await registerWithEmailAction({ email, password, confirmPassword })
        : await loginWithEmailAction({ email, password });

      // ملاحظة: عند النجاح تُنفَّذ redirect() داخل الـ Server Action نفسها
      // فترمي NEXT_REDIRECT ولا نصل هذا السطر إطلاقًا - لا حاجة لمعالجة
      // "ok: true" هنا صراحة، لكنه محفوظ للأمان في النوع.
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
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

      <div>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          كلمة المرور
        </label>
        <input
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          dir="ltr"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {isRegister && (
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
      )}

      {!isRegister && (
        <div className="text-left">
          <a href="/forgot-password" className="text-sm text-primary hover:underline">
            نسيت كلمة المرور؟
          </a>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-primary py-3.5 text-base font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {isPending
          ? "جارٍ المعالجة..."
          : isRegister
            ? "إنشاء حساب"
            : "تسجيل الدخول"}
      </button>
    </form>
  );
}
