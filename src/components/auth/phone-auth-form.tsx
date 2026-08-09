"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithPhoneAction,
  registerWithPhoneAction,
} from "@/lib/auth/credentials.actions";
import { normalizeAndValidateIraqiPhone } from "@/lib/auth/phone";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function PhoneAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [localPhone, setLocalPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // تحقق فوري من جهة العميل (UX فقط) - نفس دالة التطبيع المستخدَمة في
  // الـ Server Action تمامًا، حتى لا يتعارض الطرفان.
  const clientPhoneCheck = localPhone ? normalizeAndValidateIraqiPhone(localPhone) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);

    const phoneResult = normalizeAndValidateIraqiPhone(localPhone);
    if (!phoneResult.ok) {
      setError(phoneResult.error);
      return;
    }

    startTransition(async () => {
      const result = isRegister
        ? await registerWithPhoneAction({
            phone: phoneResult.normalized,
            password,
            confirmPassword,
          })
        : await loginWithPhoneAction({ phone: phoneResult.normalized, password });

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
          رقم الهاتف
        </label>
        <div className="flex gap-2" dir="ltr">
          <span className="flex items-center rounded-xl border border-gray-300 bg-gray-50 px-3 text-base text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            +964
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            className={inputClass}
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            placeholder="07XXXXXXXXX"
          />
        </div>
        {localPhone && clientPhoneCheck && !clientPhoneCheck.ok && (
          <p className="mt-1 text-xs text-danger">{clientPhoneCheck.error}</p>
        )}
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

      {isRegister && (
        <p className="text-center text-xs text-gray-400">لا يوجد كود تحقق - يتم تفعيل الحساب فورًا</p>
      )}
    </form>
  );
}
