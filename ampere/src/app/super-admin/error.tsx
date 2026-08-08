"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/**
 * إصلاح فجوة موجودة أصلاً في المشروع: `requirePlatformAdmin()` (ومثيلاتها
 * `requireTenantContext()` في /app) كانت ترمي أخطاء بلا أي error boundary
 * في أي مكان بالمشروع، فتصل لصفحة الخطأ الافتراضية القبيحة من Next.js.
 * هذا الملف يُعالج ذلك محليًا للوحة Super Admin تحديدًا.
 */
export default function SuperAdminError({ error }: { error: Error & { digest?: string } }) {
  const isAuthError =
    error.name === "UnauthenticatedError" || error.name === "ForbiddenError";

  useEffect(() => {
    // رفض صلاحية متوقَّع (مستخدم بلا إذن) ليس عطلاً يستحق تنبيه Sentry -
    // فقط الأخطاء غير المتوقَّعة تُبلَّغ.
    if (!isAuthError) {
      Sentry.captureException(error);
    }
  }, [error, isAuthError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-bold text-danger">
          {isAuthError ? "لا تملك صلاحية الوصول" : "حدث خطأ غير متوقع"}
        </h1>
        <p className="mb-4 text-sm text-gray-500">{error.message}</p>
        <Link
          href="/app"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          العودة للتطبيق
        </Link>
      </div>
    </div>
  );
}
