"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * إصلاح فجوة موجودة أصلاً في المشروع: لم يوجد أي error boundary لمسار
 * /app بأكمله، فأي خطأ يرميه requireTenantContext() (بما فيها أخطاء دورة
 * حياة الاشتراك الجديدة في المرحلة 9) كان يصل لصفحة خطأ Next.js
 * الافتراضية غير المصمَّمة لهذا التطبيق.
 */
export default function AppError({ error }: { error: Error & { digest?: string } }) {
  const isLifecycleError =
    error.name === "TenantSuspendedError" || error.name === "TenantCancelledError";

  useEffect(() => {
    // لا نُبلّغ Sentry بأخطاء دورة حياة متوقَّعة (تعليق/إلغاء مستأجر) -
    // هذه سلوك عادي متعمَّد في النظام وليست عطلاً يحتاج تنبيهًا.
    if (!isLifecycleError) {
      Sentry.captureException(error);
    }
  }, [error, isLifecycleError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-bold text-danger">
          {isLifecycleError ? "الوصول غير متاح حاليًا" : "حدث خطأ غير متوقع"}
        </h1>
        <p className="mb-4 text-sm text-gray-500">{error.message}</p>
        {isLifecycleError && (
          <p className="mb-4 text-xs text-gray-400">
            للاستفسار أو إعادة التفعيل، تواصل مع فريق الدعم.
          </p>
        )}
      </div>
    </div>
  );
}
